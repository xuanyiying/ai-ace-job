import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  message,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Card,
  Typography,
  Tooltip,
  Popconfirm,
  Switch,
  InputNumber,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  modelAdminService,
  ModelConfig,
  CreateModelConfigDto,
} from '../services/model-admin-service';
import './common.css';
import './admin.css';

const { Title, Text } = Typography;

const ModelManagementPage: React.FC = () => {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
  const [form] = Form.useForm();
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<
    string | undefined
  >();

  useEffect(() => {
    loadModels();
  }, [selectedProvider]);

  const loadModels = async () => {
    setLoading(true);
    try {
      const response = await modelAdminService.listModels({
        provider: selectedProvider,
        limit: 100,
      });
      setModels(response.data);
    } catch (error) {
      message.error('加载模型配置失败');
      console.error('Load models error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingModel(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (model: ModelConfig) => {
    setEditingModel(model);
    form.setFieldsValue({
      ...model,
      apiKey: '', // Don't show masked API key
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await modelAdminService.deleteModel(id);
      message.success('删除成功');
      loadModels();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      if (isActive) {
        await modelAdminService.enableModel(id);
        message.success('已启用');
      } else {
        await modelAdminService.disableModel(id);
        message.success('已禁用');
      }
      loadModels();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingModel(id);
    try {
      const result = await modelAdminService.testModel(id);
      if (result.status === 'valid') {
        message.success(`连接测试成功: ${result.message}`);
      } else {
        message.error(`连接测试失败: ${result.message}`);
      }
    } catch (error) {
      message.error('连接测试失败');
    } finally {
      setTestingModel(null);
    }
  };

  const handleSubmit = async (values: CreateModelConfigDto) => {
    try {
      // If editing and API key is empty, remove it from update
      const submitData =
        editingModel && !values.apiKey
          ? { ...values, apiKey: undefined }
          : values;

      if (editingModel) {
        await modelAdminService.updateModel(editingModel.id, submitData);
        message.success('更新成功');
      } else {
        await modelAdminService.createModel(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadModels();
    } catch (error) {
      message.error(editingModel ? '更新失败' : '创建失败');
    }
  };

  const handleRefreshCache = async () => {
    try {
      await modelAdminService.refreshCache();
      message.success('缓存刷新成功');
    } catch (error) {
      message.error('缓存刷新失败');
    }
  };

  const columns: ColumnsType<ModelConfig> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      fixed: 'left',
    },
    {
      title: '提供商',
      dataIndex: 'provider',
      key: 'provider',
      width: 120,
      render: (provider: string) => {
        const colors: Record<string, string> = {
          openai: 'green',
          qwen: 'blue',
          deepseek: 'purple',
          gemini: 'orange',
          siliconcloud: 'magenta',
          ollama: 'cyan',
        };
        return (
          <Tag color={colors[provider] || 'default'}>
            {provider.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'API端点',
      dataIndex: 'endpoint',
      key: 'endpoint',
      ellipsis: true,
      render: (endpoint?: string) => <Text ellipsis>{endpoint || '默认'}</Text>,
    },
    {
      title: 'API密钥',
      dataIndex: 'apiKey',
      key: 'apiKey',
      width: 150,
      render: (apiKey: string) => <Text code>{apiKey}</Text>,
    },
    {
      title: '温度',
      dataIndex: 'defaultTemperature',
      key: 'temperature',
      width: 80,
      align: 'center',
    },
    {
      title: '最大Token',
      dataIndex: 'defaultMaxTokens',
      key: 'maxTokens',
      width: 100,
      align: 'center',
    },
    {
      title: '费用(输入)',
      dataIndex: 'costPerInputToken',
      key: 'costInput',
      width: 100,
      align: 'right',
      render: (cost?: number) => (cost ? `$${cost.toFixed(6)}` : '-'),
    },
    {
      title: '费用(输出)',
      dataIndex: 'costPerOutputToken',
      key: 'costOutput',
      width: 100,
      align: 'right',
      render: (cost?: number) => (cost ? `$${cost.toFixed(6)}` : '-'),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      align: 'center',
      render: (isActive: boolean, record) => (
        <Switch
          checked={isActive}
          onChange={(checked) => handleToggleActive(record.id, checked)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="测试连接">
            <Button
              type="text"
              icon={<ApiOutlined />}
              loading={testingModel === record.id}
              onClick={() => handleTestConnection(record.id)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定删除此模型配置？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="min-h-full p-6 md:p-8 animate-fade-in relative overflow-hidden bg-primary/5">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="glass-card p-6 md:p-8 relative z-10 border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <Title
              level={2}
              className="!m-0 !text-white !font-bold tracking-tight"
            >
              模型配置管理
            </Title>
            <Text className="!text-gray-400 mt-1 block">
              管理和监控您的 AI 模型服务配置
            </Text>
          </div>

          <Space wrap className="flex-shrink-0">
            <Select
              placeholder="筛选提供商"
              className="w-40 !bg-white/5 !border-white/10"
              allowClear
              value={selectedProvider}
              onChange={setSelectedProvider}
              dropdownClassName="glass-card border-white/10"
            >
              <Select.Option value="openai">OpenAI</Select.Option>
              <Select.Option value="qwen">Qwen</Select.Option>
              <Select.Option value="deepseek">DeepSeek</Select.Option>
              <Select.Option value="gemini">Gemini</Select.Option>
              <Select.Option value="siliconcloud">SiliconCloud</Select.Option>
              <Select.Option value="ollama">Ollama</Select.Option>
            </Select>

            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefreshCache}
              className="!bg-white/5 !border-white/10 !text-gray-300 hover:!text-white"
            >
              刷新缓存
            </Button>

            <Button
              icon={<ReloadOutlined />}
              onClick={loadModels}
              className="!bg-white/5 !border-white/10 !text-gray-300 hover:!text-white"
            >
              刷新列表
            </Button>

            <button
              onClick={handleCreate}
              className="gradient-button h-9 px-4 text-sm shadow-lg hover:shadow-primary-500/20 flex items-center gap-2"
            >
              <PlusOutlined /> 新建模型
            </button>
          </Space>
        </div>

        <div className="modern-table-container">
          <Table
            columns={columns}
            dataSource={models}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1400 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              className: 'modern-pagination',
              showTotal: (total) => `共 ${total} 条`,
            }}
            className="modern-table !bg-transparent"
          />
        </div>
      </div>

      <Modal
        title={editingModel ? '编辑模型配置' : '新建模型配置'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={700}
        footer={null}
        className="glass-modal"
        centered
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            isActive: true,
            defaultTemperature: 0.7,
            defaultMaxTokens: 2000,
          }}
          className="mt-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <Form.Item
              name="name"
              label={<span className="text-gray-300">配置名称</span>}
              rules={[{ required: true, message: '请输入配置名称' }]}
            >
              <Input
                placeholder="例如: gpt-4-turbo"
                disabled={!!editingModel}
                className="!bg-white/5 !border-white/10 !text-white"
              />
            </Form.Item>

            <Form.Item
              name="provider"
              label={<span className="text-gray-300">提供商</span>}
              rules={[{ required: true, message: '请选择提供商' }]}
            >
              <Select
                placeholder="选择AI提供商"
                className="!bg-white/5 !border-white/10 !text-white"
              >
                <Select.Option value="openai">OpenAI</Select.Option>
                <Select.Option value="qwen">Qwen (通义千问)</Select.Option>
                <Select.Option value="deepseek">DeepSeek</Select.Option>
                <Select.Option value="gemini">Google Gemini</Select.Option>
                <Select.Option value="siliconcloud">
                  SiliconCloud (硅基流动)
                </Select.Option>
                <Select.Option value="ollama">Ollama (本地)</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            name="apiKey"
            label={<span className="text-gray-300">API密钥</span>}
            rules={
              editingModel ? [] : [{ required: true, message: '请输入API密钥' }]
            }
            extra={
              <span className="text-gray-500 text-xs">
                {editingModel ? '留空则不更新密钥' : ''}
              </span>
            }
          >
            <Input.Password
              placeholder={editingModel ? '留空不更新' : '输入API密钥'}
              className="!bg-white/5 !border-white/10 !text-white"
            />
          </Form.Item>

          <Form.Item
            name="endpoint"
            label={<span className="text-gray-300">API端点（可选）</span>}
          >
            <Input
              placeholder="留空使用默认端点"
              className="!bg-white/5 !border-white/10 !text-white"
            />
          </Form.Item>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <Form.Item
              name="defaultTemperature"
              label={<span className="text-gray-300">默认温度</span>}
            >
              <InputNumber
                min={0}
                max={2}
                step={0.1}
                className="w-full !bg-white/5 !border-white/10 !text-white"
              />
            </Form.Item>

            <Form.Item
              name="defaultMaxTokens"
              label={<span className="text-gray-300">默认最大Token数</span>}
            >
              <InputNumber
                min={1}
                max={100000}
                step={100}
                className="w-full !bg-white/5 !border-white/10 !text-white"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <Form.Item
              name="costPerInputToken"
              label={<span className="text-gray-300">输入Token成本</span>}
            >
              <InputNumber
                min={0}
                step={0.000001}
                precision={6}
                className="w-full !bg-white/5 !border-white/10 !text-white"
                prefix="$"
              />
            </Form.Item>

            <Form.Item
              name="costPerOutputToken"
              label={<span className="text-gray-300">输出Token成本</span>}
            >
              <InputNumber
                min={0}
                step={0.000001}
                precision={6}
                className="w-full !bg-white/5 !border-white/10 !text-white"
                prefix="$"
              />
            </Form.Item>
          </div>

          <div className="flex justify-between items-center bg-white/5 p-4 rounded-lg border border-white/5 mb-6">
            <Form.Item
              name="isActive"
              label={<span className="text-gray-300">启用该模型</span>}
              valuePropName="checked"
              className="mb-0"
            >
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>

            <Space size="middle">
              <Button
                onClick={() => setModalVisible(false)}
                className="!bg-white/5 !border-white/10 !text-gray-300"
              >
                取消
              </Button>
              <button
                type="submit"
                className="gradient-button h-9 px-8 text-sm shadow-lg hover:shadow-primary-500/20"
              >
                {editingModel ? '更新配置' : '创建配置'}
              </button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ModelManagementPage;
