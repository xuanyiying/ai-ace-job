import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Select,
  InputNumber,
  message,
  Typography,
  Popconfirm,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { adminService, InviteCode } from '../services/admin-service';
import './admin.css';

const { Title } = Typography;
const { Option } = Select;

const InviteCodeManagementPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InviteCode[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form] = Form.useForm();

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await adminService.listInviteCodes({
        page,
        limit: pageSize,
      });
      setData(response.data);
      setTotal(response.total);
    } catch (error) {
      message.error('Failed to load invitation codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, pageSize]);

  const handleGenerate = async (values: any) => {
    try {
      setGenerating(true);
      await adminService.generateInviteCodes(values);
      message.success('Invite codes generated successfully');
      setModalVisible(false);
      form.resetFields();
      loadData();
    } catch (error) {
      message.error('Failed to generate invite codes');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminService.deleteInviteCode(id);
      message.success('Invite code deleted');
      loadData();
    } catch (error) {
      message.error('Failed to delete invite code');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    message.success('Code copied to clipboard');
  };

  const columns: ColumnsType<InviteCode> = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (text) => (
        <Space>
          <Typography.Text copyable={{ text: text }}>{text}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'BATCH' ? 'blue' : 'cyan'}>{type}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default';
        if (status === 'UNUSED') color = 'success';
        if (status === 'USED') color = 'processing';
        if (status === 'EXPIRED') color = 'error';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Valid Until',
      dataIndex: 'validUntil',
      key: 'validUntil',
      render: (date) =>
        date ? new Date(date).toLocaleDateString() : 'Permanent',
    },
    {
      title: 'Used By',
      dataIndex: 'usedBy',
      key: 'usedBy',
      render: (user) => user || '-',
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="Delete this code?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-container">
      <Card>
        <div className="admin-header">
          <Title level={3} style={{ margin: 0 }}>
            Invitation Code Management
          </Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalVisible(true)}
            >
              Generate Codes
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      <Modal
        title="Generate Invite Codes"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleGenerate}
          initialValues={{ type: 'SINGLE', count: 1, validDays: 7 }}
        >
          <Form.Item
            name="type"
            label="Generation Type"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="SINGLE">Single Code</Option>
              <Option value="BATCH">Batch Generation</Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, current) => prev.type !== current.type}
          >
            {({ getFieldValue }) =>
              getFieldValue('type') === 'BATCH' ? (
                <Form.Item
                  name="count"
                  label="Number of Codes"
                  rules={[{ required: true, min: 1, max: 100 }]}
                >
                  <InputNumber min={1} max={100} style={{ width: '100%' }} />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item
            name="validDays"
            label="Validity Period (Days)"
            rules={[{ required: true, min: 1 }]}
            help="Set to 0 for permanent validity"
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={generating}>
                Generate
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InviteCodeManagementPage;
