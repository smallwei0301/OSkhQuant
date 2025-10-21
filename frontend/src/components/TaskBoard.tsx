import { useMemo } from 'react';
import { Card, Progress, Table, Tag, Button, Space, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTaskUpdates } from '../hooks/useTaskUpdates';
import type { TaskStatus } from '../types/task';

const { Text } = Typography;

interface Props {
  taskIds: string[];
}

function TaskBoard({ taskIds }: Props) {
  const { tasks, cancelTask, retryTask } = useTaskUpdates({ taskIds, pollingInterval: 5000 });

  const dataSource = useMemo(() =>
    Object.values(tasks).sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    }),
  [tasks]);

  const columns: ColumnsType<TaskStatus> = [
    {
      title: '任務 ID',
      dataIndex: 'taskId',
      key: 'taskId'
    },
    {
      title: '進度',
      dataIndex: 'progress',
      key: 'progress',
      render: (value: number) => <Progress percent={Math.round(value)} />
    },
    {
      title: '狀態',
      dataIndex: 'state',
      key: 'state',
      render: (state: TaskStatus['state']) => {
        const colors: Record<TaskStatus['state'], string> = {
          pending: 'gold',
          running: 'blue',
          completed: 'green',
          failed: 'red',
          cancelled: 'default'
        };
        return <Tag color={colors[state]}>{state}</Tag>;
      }
    },
    {
      title: '訊息',
      dataIndex: 'message',
      key: 'message',
      render: (message?: string, record?: TaskStatus) => (
        <Space direction="vertical">
          <Text>{message ?? '—'}</Text>
          {record?.error && <Text type="danger">{record.error}</Text>}
        </Space>
      )
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            danger
            onClick={async () => {
              try {
                await cancelTask(record.taskId);
                message.success('已取消任務');
              } catch (error) {
                message.error('取消任務失敗');
              }
            }}
            disabled={record.state !== 'running'}
          >
            取消
          </Button>
          <Button
            size="small"
            onClick={async () => {
              try {
                await retryTask(record.taskId);
                message.success('已重新排程任務');
              } catch (error) {
                message.error('重試任務失敗');
              }
            }}
            disabled={record.state !== 'failed'}
          >
            重試
          </Button>
        </Space>
      )
    }
  ];

  return (
    <Card title="任務進度" bordered>
      <Table
        rowKey="taskId"
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        locale={{ emptyText: '目前沒有任務' }}
      />
    </Card>
  );
}

export default TaskBoard;
