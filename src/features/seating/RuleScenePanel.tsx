// M9-1: RuleScenePanel — 企业/政府/通用规则场景切换
import { Card, Radio, Space } from 'antd';
import type { RuleScene } from '@/types';
import { useGuestStore } from '@/stores/guest';

const SCENE_DESC: Record<RuleScene, string> = {
  corporate: '企业场景：VIP 优先前排，高管相邻，不同部门混合。',
  government: '政府场景：按级别就座，重要来宾主席台，同级别同区。',
  general: '通用场景：仅使用参会者关系约束，无额外内置规则。',
};

const OPTIONS: { label: string; value: RuleScene }[] = [
  { label: '企业', value: 'corporate' },
  { label: '政府', value: 'government' },
  { label: '通用', value: 'general' },
];

export function RuleScenePanel() {
  const scene = useGuestStore((s) => s.ruleScene);
  const setScene = useGuestStore((s) => s.setRuleScene);
  return (
    <Card size="small" title="规则场景" data-testid="rule-scene-panel">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Radio.Group
          value={scene}
          onChange={(e) => setScene(e.target.value)}
          options={OPTIONS}
          optionType="button"
          aria-label="rule-scene"
        />
        <p style={{ color: '#8c8c8c', fontSize: 12, margin: 0 }} data-testid="scene-desc">
          {SCENE_DESC[scene]}
        </p>
      </Space>
    </Card>
  );
}
