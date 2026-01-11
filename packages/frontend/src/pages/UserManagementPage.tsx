import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Typography,
  Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { adminService } from '../services/admin-service';
import './common.css';

const { Title } = Typography;
const { Option } = Select;

interface User {
  id: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'DISABLED';
  createdAt: string;
  lastLoginAt?: string;
}

const UserManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const loadUsers = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const res = await adminService.getUsers({
        page,
        limit: pageSize,
        search: searchText,
      });
      setUsers(res.data);
      setPagination({ current: page, pageSize, total: res.total });
    } catch {
      message.error(t('admin.users.load_failed'));
      // Mock data for development
      setUsers([
        {
          id: '1',
          username: 'admin',
          email: 'admin@example.com',
          role: 'ADMIN',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        },
        {
          id: '2',
          username: 'user1',
          email: 'user1@example.com',
          role: 'USER',
          status: 'ACTIVE',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ]);
      setPagination({ current: 1, pageSize: 10, total: 2 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSearch = () => {
    loadUsers(1, pagination.pageSize);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
    });
    setEditModalVisible(true);
  };

  const handleEditSubmit = async (values: Record<string, unknown>) => {
    if (!editingUser) return;
    try {
      await adminService.updateUser(editingUser.id, values);
      message.success(t('admin.users.update_success'));
      setEditModalVisible(false);
      loadUsers(pagination.current, pagination.pageSize);
    } catch {
      message.error(t('admin.users.update_failed'));
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await adminService.deleteUser(userId);
      message.success(t('admin.users.delete_success'));
      loadUsers(pagination.current, pagination.pageSize);
    } catch {
      message.error(t('admin.users.delete_failed'));
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await adminService.updateUser(user.id, { status: newStatus });
      message.success(t('admin.users.update_success'));
      loadUsers(pagination.current, pagination.pageSize);
    } catch {
      message.error(t('admin.users.update_failed'));
    }
  };

  const columns: ColumnsType<User> = [
    {
      title: t('admin.users.username'),
      dataIndex: 'username',
      key: 'username',
      render: (text: string) => (
        <Space>
          <UserOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: t('admin.users.email'),
      dataIndex: 'email',
      key: 'email',
      responsive: ['md'],
    },
    {
      title: t('admin.users.role'),
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'ADMIN' ? 'gold' : 'blue'}>
          {role === 'ADMIN'
            ? t('admin.users.role_admin')
            : t('admin.users.role_user')}
        </Tag>
      ),
    },
    {
      title: t('admin.users.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>
          {status === 'ACTIVE'
            ? t('admin.users.status_active')
            : t('admin.users.status_disabled')}
        </Tag>
      ),
    },
    {
      title: t('admin.users.created_at'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      responsive: ['lg'],
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: t('admin.users.actions'),
      key: 'actions',
      render: (_: unknown, record: User) => (
        <Space size="small" wrap>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Button
            type="text"
            size="small"
            onClick={() => handleToggleStatus(record)}
          >
            {record.status === 'ACTIVE'
              ? t('admin.users.disable_user')
              : t('admin.users.enable_user')}
          </Button>
          <Popconfirm
            title={t('admin.users.delete_confirm')}
            onConfirm={() => handleDelete(record.id)}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-container">
      <Card>
        <Title level={2} style={{ marginBottom: 24 }}>
          {t('admin.users.title')}
        </Title>

        <div className="table-toolbar">
          <Space wrap>
            <Input
              placeholder={t('admin.users.search_placeholder')}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 250 }}
            />
            <Button type="primary" onClick={handleSearch}>
              {t('common.search')}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => loadUsers()}>
              {t('common.refresh')}
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) =>
              t('admin.users.total_users', { count: total }),
            onChange: (page, pageSize) => loadUsers(page, pageSize),
          }}
          scroll={{ x: 'max-content' }}
        />

        <Modal
          title={t('admin.users.edit_user')}
          open={editModalVisible}
          onCancel={() => setEditModalVisible(false)}
          footer={null}
        >
          <Form form={form} layout="vertical" onFinish={handleEditSubmit}>
            <Form.Item
              name="username"
              label={t('admin.users.username')}
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="email"
              label={t('admin.users.email')}
              rules={[{ required: true, type: 'email' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="role" label={t('admin.users.role')}>
              <Select>
                <Option value="USER">{t('admin.users.role_user')}</Option>
                <Option value="ADMIN">{t('admin.users.role_admin')}</Option>
              </Select>
            </Form.Item>
            <Form.Item name="status" label={t('admin.users.status')}>
              <Select>
                <Option value="ACTIVE">{t('admin.users.status_active')}</Option>
                <Option value="DISABLED">
                  {t('admin.users.status_disabled')}
                </Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  {t('common.save')}
                </Button>
                <Button onClick={() => setEditModalVisible(false)}>
                  {t('common.cancel')}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    </div>
  );
};

export default UserManagementPage;
