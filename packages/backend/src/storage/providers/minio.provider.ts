import {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import path from 'path';
import { OssService, UploadResult, FileInfo } from './oss.interface';
import { OssConfig } from '../config/oss.config';
import { Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

export class MinIOService implements OssService {
  public bucketName: string;
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private config: OssConfig;
  private logger = new Logger(MinIOService.name);

  constructor(config: OssConfig) {
    this.config = config;
    this.bucket = config.bucket;
    this.bucketName = config.bucket;
    this.s3Client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: process.env.OSS_PATH_STYLE === 'true',
    });

    // Initialize bucket asynchronously
    this.initializeBucket().catch((error) => {
      this.logger.error(
        'Failed to initialize bucket during construction:',
        error
      );
    });
  }

  /**
   * 初始化存储桶
   */
  async initializeBucket(): Promise<void> {
    try {
      // 检查存储桶是否存在
      const headCommand = new HeadBucketCommand({
        Bucket: this.bucket,
      });

      try {
        await this.s3Client.send(headCommand);
        this.logger.log(`OSS Bucket ${this.bucket} already exists`);
      } catch (headError: any) {
        if (
          headError.name === 'NotFound' ||
          headError.$metadata?.httpStatusCode === 404
        ) {
          // 存储桶不存在，创建它
          const createCommand = new CreateBucketCommand({
            Bucket: this.bucket,
          });

          this.logger.log('Creating OSS bucket...', {
            bucket: this.bucket,
            endpoint: this.config.endpoint,
          });
          await this.s3Client.send(createCommand);
          this.logger.log(`OSS Bucket ${this.bucket} created successfully`);
        } else {
          throw headError;
        }
      }
    } catch (error: any) {
      if (
        error.name === 'BucketAlreadyOwnedByYou' ||
        error.name === 'BucketAlreadyExists'
      ) {
        this.logger.log(`OSS Bucket ${this.bucket} already exists`);
      } else {
        this.logger.error('Error creating OSS bucket:', error);
        throw error;
      }
    }

    // 设置存储桶策略为公共读写
    await this.setBucketPublicPolicy();
  }

  /**
   * 设置存储桶为公共读写策略
   */
  private async setBucketPublicPolicy(): Promise<void> {
    try {
      // 为 MinIO 设置公共读写策略
      const bucketPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          },
          {
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:ListBucket'],
            Resource: [`arn:aws:s3:::${this.bucket}`],
          },
        ],
      };

      const policyCommand = new PutBucketPolicyCommand({
        Bucket: this.bucket,
        Policy: JSON.stringify(bucketPolicy),
      });

      await this.s3Client.send(policyCommand);
      this.logger.log(
        `OSS Bucket ${this.bucket} public policy set successfully`
      );
    } catch (error: any) {
      this.logger.warn('Error setting OSS bucket public policy:', error);

      // 如果策略设置失败，尝试使用 MinIO 特定的方法
      try {
        await this.setMinIOPublicPolicy();
      } catch (minioError) {
        this.logger.warn(
          'MinIO public policy fallback also failed:',
          minioError
        );
        // 不抛出错误，因为策略设置失败不应该阻止服务启动
      }
    }
  }

  /**
   * MinIO 特定的公共策略设置方法
   */
  private async setMinIOPublicPolicy(): Promise<void> {
    try {
      // 使用 MinIO 特定的公共读取策略
      const publicReadPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: '*' },
            Action: ['s3:GetBucketLocation', 's3:ListBucket'],
            Resource: [`arn:aws:s3:::${this.bucket}`],
          },
          {
            Effect: 'Allow',
            Principal: { AWS: '*' },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          },
        ],
      };

      const policyCommand = new PutBucketPolicyCommand({
        Bucket: this.bucket,
        Policy: JSON.stringify(publicReadPolicy),
      });

      await this.s3Client.send(policyCommand);
      this.logger.log(
        `MinIO Bucket ${this.bucket} public read policy set successfully`
      );
    } catch (error) {
      this.logger.error('Failed to set MinIO public policy:', error);
      throw error;
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(
    file: Buffer | Readable,
    originalName: string,
    contentType: string,
    folder?: string
  ): Promise<UploadResult> {
    try {
      // 生成唯一文件名
      const fileExtension = path.extname(originalName);
      const fileName = `${uuid()}${fileExtension}`;
      const key = folder ? `${folder}/${fileName}` : fileName;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: {
          originalName: encodeURIComponent(originalName),
          uploadTime: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      const url = this.getFileUrl(key);

      // 对于流式上传，我们无法预先知道大小
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const { ContentLength } = await this.s3Client.send(headCommand);

      return {
        key,
        url,
        size: ContentLength || 0,
        contentType,
      };
    } catch (error) {
      console.error('Error uploading file to OSS:', error);
      throw new Error('Failed to upload file to OSS');
    }
  }

  /**
   * 下载文件
   */
  async downloadFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new Error('File not found');
      }

      // 将流转换为Buffer
      const chunks: Buffer[] = [];
      const stream = response.Body as Readable;

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('Error downloading file from OSS:', error);
      throw new Error('Failed to download file from OSS');
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error deleting file from OSS:', error);
      throw new Error('Failed to delete file from OSS');
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(key: string): Promise<FileInfo> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        key,
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType || 'application/octet-stream',
        url: this.getFileUrl(key),
      };
    } catch (error) {
      console.error('Error getting file info from OSS:', error);
      throw new Error('Failed to get file info from OSS');
    }
  }

  /**
   * 列出文件
   */
  async listFiles(prefix?: string, maxKeys: number = 100): Promise<FileInfo[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const response = await this.s3Client.send(command);

      if (!response.Contents) {
        return [];
      }

      return response.Contents.map((obj: any) => ({
        key: obj.Key || '',
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
        contentType: 'application/octet-stream', // S3 ListObjects不返回ContentType
        url: this.getFileUrl(obj.Key || ''),
      }));
    } catch (error) {
      console.error('Error listing files from OSS:', error);
      throw new Error('Failed to list files from OSS');
    }
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.getFileInfo(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取文件访问URL
   */
  getFileUrl(key: string): string {
    // 检查key是否已经包含了完整的URL，避免重复拼接
    if (key.startsWith('http://') || key.startsWith('https://')) {
      return key;
    }

    // 使用OSS公网端点
    const publicEndpoint = process.env.OSS_PUBLIC_ENDPOINT;
    this.logger.log(`OSS_PUBLIC_ENDPOINT: ${publicEndpoint}`);

    if (publicEndpoint) {
      // 确保URL格式正确
      const baseUrl = publicEndpoint.endsWith('/')
        ? publicEndpoint.slice(0, -1)
        : publicEndpoint;
      const bucketPath = this.bucket;
      const keyPath = key.startsWith('/') ? key.substring(1) : key;
      return `${baseUrl}/${bucketPath}/${keyPath}`;
    }

    // 默认使用内部OSS地址
    const endpoint = this.config.endpoint;
    if (process.env.NODE_ENV === 'development' && endpoint.includes(':9000')) {
      return `${endpoint.replace(/http:\/\/[^:]+:/, 'http://127.0.0.1:')}/${this.bucket}/${key}`;
    }

    return `${endpoint}/${this.bucket}/${key}`;
  }

  /**
   * 批量删除文件
   */
  async deleteFiles(keys: string[]): Promise<void> {
    try {
      const deletePromises = keys.map((key) => this.deleteFile(key));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting files from OSS:', error);
      throw new Error('Failed to delete files from OSS');
    }
  }

  /**
   * 复制文件
   */
  async copyFile(sourceKey: string, targetKey: string): Promise<void> {
    try {
      // 先下载源文件
      const fileBuffer = await this.downloadFile(sourceKey);
      const fileInfo = await this.getFileInfo(sourceKey);

      // 再上传到目标位置
      await this.uploadFile(
        fileBuffer,
        path.basename(targetKey),
        fileInfo.contentType,
        path.dirname(targetKey)
      );
    } catch (error) {
      console.error('Error copying file in OSS:', error);
      throw new Error('Failed to copy file in OSS');
    }
  }

  /**
   * 生成预签名上传URL
   */
  async getPresignedUploadUrl(
    key: string,
    expires: number = 3600,
    contentType?: string
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      });

      // 使用内部OSS地址生成签名
      const internalUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: expires,
      });
      console.log('Internal URL generated:', internalUrl);

      // 将内部OSS地址替换为外部可访问的地址
      const publicEndpoint = process.env.OSS_PUBLIC_ENDPOINT;

      if (publicEndpoint) {
        // 从内部URL中提取路径部分
        const urlObj = new URL(internalUrl);
        const pathWithQuery = urlObj.pathname + urlObj.search;

        // 构建新的外部可访问URL
        const externalUrl = `${publicEndpoint}${pathWithQuery}`;
        console.log('External URL generated:', externalUrl);
        return externalUrl;
      }

      const externalUrl = internalUrl.replace(
        /http:\/\/[^:]+:9000/g,
        'http://localhost:9000'
      );
      console.log('External URL generated:', externalUrl);
      return externalUrl;
    } catch (error) {
      console.error('Error generating presigned upload URL:', error);
      throw new Error('Failed to generate presigned upload URL');
    }
  }

  /**
   * 生成预签名下载URL
   */
  async getPresignedDownloadUrl(
    key: string,
    expires: number = 3600
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      // 获取内部URL
      const internalUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: expires,
      });

      // 将内部OSS地址替换为外部可访问的地址
      const publicEndpoint = process.env.OSS_PUBLIC_ENDPOINT;

      if (publicEndpoint) {
        // 从内部URL中提取路径部分
        const urlObj = new URL(internalUrl);
        const pathWithQuery = urlObj.pathname + urlObj.search;

        // 构建新的外部可访问URL
        const externalUrl = `${publicEndpoint}${pathWithQuery}`;
        console.log('External download URL generated:', externalUrl);
        return externalUrl;
      }

      // 如果没有配置外部端点，则使用默认替换
      const externalUrl = internalUrl.replace(
        /http:\/\/[^:]+:9000/g,
        'http://localhost:9000'
      );
      console.log('External download URL generated:', externalUrl);
      return externalUrl;
    } catch (error) {
      console.error('Error generating presigned download URL:', error);
      throw new Error('Failed to generate presigned download URL');
    }
  }
}
