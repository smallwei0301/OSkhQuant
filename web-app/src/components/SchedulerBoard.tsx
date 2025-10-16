import { useMemo } from 'react';
import type { SchedulerPlan } from '../types';

interface SchedulerBoardProps {
  plans: SchedulerPlan[];
  onChange: (plans: SchedulerPlan[]) => void;
  strategyName: string;
  availableStrategies: { id: string; name: string }[];
}

const createPlan = (strategyId: string): SchedulerPlan => ({
  id: `plan-${Date.now()}`,
  name: '每日收盤後回測',
  cron: '0 9 * * *',
  strategyId,
  enabled: true
});

export function SchedulerBoard({ plans, onChange, strategyName, availableStrategies }: SchedulerBoardProps) {
  const emptyState = plans.length === 0;

  const nextPlanName = useMemo(() => `${strategyName} - 排程`, [strategyName]);

  const handleAdd = () => {
    const defaultStrategy = availableStrategies[0]?.id ?? 'default';
    onChange([...plans, { ...createPlan(defaultStrategy), name: nextPlanName }]);
  };

  const handleUpdate = (id: string, partial: Partial<SchedulerPlan>) => {
    onChange(plans.map((plan) => (plan.id === id ? { ...plan, ...partial } : plan)));
  };

  const handleRemove = (id: string) => {
    onChange(plans.filter((plan) => plan.id !== id));
  };

  return (
    <div className="card">
      <h2>排程管理</h2>
      <p className="muted">
        模擬 Netlify Scheduled Functions 排程，協助規劃回測自動執行時間。建議以台北時間每日收盤後 (21:00) 觸發，並保留
        安全緩衝以確保券商資料已同步。
      </p>
      <button type="button" className="button" onClick={handleAdd}>
        ➕ 新增排程
      </button>

      {emptyState ? (
        <p className="muted">尚未建立排程，可點擊「新增排程」建立。</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>名稱</th>
                <th>Cron 表達式</th>
                <th>策略</th>
                <th>啟用</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id}>
                  <td>
                    <input
                      type="text"
                      value={plan.name}
                      onChange={(event) => handleUpdate(plan.id, { name: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={plan.cron}
                      onChange={(event) => handleUpdate(plan.id, { cron: event.target.value })}
                      placeholder="0 21 * * *"
                    />
                  </td>
                  <td>
                    <select
                      value={plan.strategyId}
                      onChange={(event) => handleUpdate(plan.id, { strategyId: event.target.value })}
                    >
                      {availableStrategies.map((strategy) => (
                        <option key={strategy.id} value={strategy.id}>
                          {strategy.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={plan.enabled}
                        onChange={(event) => handleUpdate(plan.id, { enabled: event.target.checked })}
                      />
                      <span>{plan.enabled ? '啟用' : '停用'}</span>
                    </label>
                  </td>
                  <td>
                    <button type="button" className="link-button danger" onClick={() => handleRemove(plan.id)}>
                      刪除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
