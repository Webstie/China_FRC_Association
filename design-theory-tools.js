const templatesSection = document.getElementById('templates');

const clampNumber = (value, fallback = 0) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const valueOf = (form, name) => {
  const field = form.elements[name];
  return field ? String(field.value || '').trim() : '';
};

const writeOutput = (form, text) => {
  const output = form.querySelector('[data-tool-output]');
  if (output) output.value = text;
};

const copyOutput = async (button) => {
  const tool = button.closest('.template-tool');
  const output = tool?.querySelector('[data-tool-output]');
  if (!output) return;
  output.select();
  try {
    await navigator.clipboard.writeText(output.value);
    button.textContent = '已复制';
    window.setTimeout(() => {
      button.textContent = '复制结果';
    }, 1200);
  } catch {
    document.execCommand('copy');
  }
};

const downloadOutput = (button) => {
  const tool = button.closest('.template-tool');
  const output = tool?.querySelector('[data-tool-output]');
  const title = tool?.querySelector('h3')?.textContent || 'FRC Design Tool';
  if (!output || !output.value.trim()) return;
  const blob = new Blob([output.value], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/\s+/g, '-').toLowerCase()}.txt`;
  link.click();
  URL.revokeObjectURL(url);
};

const renderRequirements = (form) => {
  const cycle = clampNumber(valueOf(form, 'cycle'), 0);
  const tolerance = clampNumber(valueOf(form, 'tolerance'), 0);
  const priority = valueOf(form, 'priority');
  const failure = valueOf(form, 'failure');
  const readiness = [
    valueOf(form, 'strategy'),
    valueOf(form, 'coverage'),
    cycle > 0 ? `${cycle}s cycle target` : '',
    tolerance > 0 ? `${tolerance}cm driver tolerance` : '',
    failure,
  ].filter(Boolean).length;

  const risk =
    failure === '整机无法继续比赛' ? 'High' :
    failure === '丢失一次得分循环' ? 'Medium' :
    'Low';

  writeOutput(form, [
    '# Robot Requirement',
    `功能: ${valueOf(form, 'feature') || '未命名功能'}`,
    `服务的比赛策略: ${valueOf(form, 'strategy') || '待补充'}`,
    `优先级: ${priority || '待确定'}`,
    `目标循环时间: ${cycle ? `${cycle} 秒` : '待测试'}`,
    `覆盖范围: ${valueOf(form, 'coverage') || '高度 / 距离 / 角度待定义'}`,
    `驾驶误差容忍: ${tolerance ? `±${tolerance} cm` : '待定义'}`,
    `失败影响: ${failure || '待评估'}`,
    `风险等级: ${risk}`,
    `需求完整度: ${readiness}/5`,
    '',
    '验收标准:',
    `- 连续 10 次运行，至少成功 ${priority === 'Must Have' ? 8 : 7} 次。`,
    `- 单次动作不超过 ${cycle || '目标'} 秒。`,
    '- 失败后不应损坏其他子系统，并且可以在比赛暂停间隙快速复位。',
    '',
    '下一步:',
    '- 把覆盖范围画进 master layout。',
    '- 为该功能建立 prototype test，验证最高风险问题。',
  ].join('\n'));
};

const renderInterface = (form) => {
  const from = valueOf(form, 'from') || '上游子系统';
  const to = valueOf(form, 'to') || '下游子系统';
  const centerDistance = clampNumber(valueOf(form, 'centerDistance'), 0);

  writeOutput(form, [
    '# Subsystem Interface',
    `接口名称: ${from} -> ${to}`,
    `输入来源: ${from}`,
    `输出对象: ${to}`,
    `Game piece 状态: ${valueOf(form, 'pieceState') || '位置 / 姿态 / 速度待定义'}`,
    `交接高度: ${valueOf(form, 'handoffHeight') || '待定义'}`,
    `交接角度: ${valueOf(form, 'handoffAngle') || '待定义'}`,
    `中心距 / 轴线: ${centerDistance ? `${centerDistance} mm` : valueOf(form, 'axis') || '待定义'}`,
    `安装基准: ${valueOf(form, 'mounting') || '安装面 / 孔位 / 板厚待定义'}`,
    `空间盒: ${valueOf(form, 'envelope') || '待定义'}`,
    `维护入口: ${valueOf(form, 'service') || '待定义'}`,
    `需要通知的小组: ${valueOf(form, 'notify') || '机械 / 电控 / 软件 / 驾驶待确认'}`,
    '',
    '冻结条件:',
    '- 安装面、孔位、轴线和空间盒必须先冻结，再开始子系统详细 CAD。',
    '- 任一接口变更必须同步更新 master layout 和相关子系统 CAD。',
  ].join('\n'));
};

const renderPrototype = (form) => {
  const attempts = Math.max(1, clampNumber(valueOf(form, 'attempts'), 10));
  const success = Math.max(0, clampNumber(valueOf(form, 'success'), 8));
  const successRate = Math.round((success / attempts) * 100);
  const decision =
    successRate >= 80 ? '可以进入 CAD 细化，但仍需保留改版记录。' :
    successRate >= 60 ? '需要修改参数或局部结构后复测。' :
    '不建议直接进入整机设计，应重新评估方案。';

  writeOutput(form, [
    '# Prototype Test Plan',
    `原型名称: ${valueOf(form, 'prototype') || '未命名原型'}`,
    `验证风险: ${valueOf(form, 'risk') || '待定义'}`,
    `测试次数: ${attempts}`,
    `成功次数: ${success}`,
    `成功率: ${successRate}%`,
    `记录数据: ${valueOf(form, 'data') || '速度 / 电流 / 命中率 / 卡料次数待定义'}`,
    `失败现象: ${valueOf(form, 'failureMode') || '待记录'}`,
    '',
    '结论:',
    decision,
    '',
    '必须写回:',
    '- CAD 尺寸或结构变化。',
    '- 计算表中的速度、齿比、电流或中心距假设。',
    '- 设计评审中的通过 / 待改 / 放弃结论。',
  ].join('\n'));
};

const toolMarkup = `
  <h2>可直接使用的设计工具</h2>
  <p class="section-intro">把原来的模板改成可填写工具。队员可以在讨论时输入参数，直接生成需求卡、接口卡和原型测试记录。</p>
  <div class="template-tools">
    <article class="template-tool">
      <div class="tool-heading">
        <span>01</span>
        <div>
          <h3>Robot Requirements Builder</h3>
          <p>把比赛策略转成可验证的机器人功能需求。</p>
        </div>
      </div>
      <form data-tool="requirements">
        <label>功能名称<input name="feature" placeholder="例如：地面拾取 Note"></label>
        <label>服务的策略<textarea name="strategy" rows="2" placeholder="例如：缩短循环时间，优先保证近距离得分"></textarea></label>
        <div class="tool-row">
          <label>优先级<select name="priority"><option>Must Have</option><option>Should Have</option><option>Could Have</option></select></label>
          <label>目标循环时间 秒<input name="cycle" type="number" min="0" step="0.1" value="6"></label>
        </div>
        <label>覆盖范围<textarea name="coverage" rows="2" placeholder="高度、距离、角度、场地位置"></textarea></label>
        <div class="tool-row">
          <label>驾驶误差 cm<input name="tolerance" type="number" min="0" step="1" value="10"></label>
          <label>失败影响<select name="failure"><option>整机无法继续比赛</option><option>丢失一次得分循环</option><option>可以快速复位</option></select></label>
        </div>
        <div class="tool-actions">
          <button type="button" data-generate>生成需求卡</button>
          <button type="button" data-copy>复制结果</button>
          <button type="button" data-download>下载 TXT</button>
        </div>
        <textarea class="tool-output" data-tool-output rows="12" readonly></textarea>
      </form>
    </article>

    <article class="template-tool">
      <div class="tool-heading">
        <span>02</span>
        <div>
          <h3>Subsystem Interface Builder</h3>
          <p>把子系统之间的安装、交接和空间边界提前冻结。</p>
        </div>
      </div>
      <form data-tool="interface">
        <div class="tool-row">
          <label>输入子系统<input name="from" placeholder="Intake"></label>
          <label>输出子系统<input name="to" placeholder="Indexer"></label>
        </div>
        <label>Game piece 状态<textarea name="pieceState" rows="2" placeholder="姿态、速度、是否被压缩、是否已定位"></textarea></label>
        <div class="tool-row">
          <label>交接高度<input name="handoffHeight" placeholder="例如：180 mm"></label>
          <label>交接角度<input name="handoffAngle" placeholder="例如：15 deg upward"></label>
        </div>
        <div class="tool-row">
          <label>中心距 mm<input name="centerDistance" type="number" min="0" step="0.1"></label>
          <label>轴线说明<input name="axis" placeholder="例如：roller axis parallel to frame front"></label>
        </div>
        <label>安装基准<textarea name="mounting" rows="2" placeholder="安装面、孔位、板厚、定位边"></textarea></label>
        <label>空间盒<textarea name="envelope" rows="2" placeholder="允许占用的长宽高和禁入区域"></textarea></label>
        <div class="tool-row">
          <label>维护入口<input name="service" placeholder="例如：顶部可拆盖板"></label>
          <label>通知小组<input name="notify" placeholder="机械、电控、软件"></label>
        </div>
        <div class="tool-actions">
          <button type="button" data-generate>生成接口卡</button>
          <button type="button" data-copy>复制结果</button>
          <button type="button" data-download>下载 TXT</button>
        </div>
        <textarea class="tool-output" data-tool-output rows="12" readonly></textarea>
      </form>
    </article>

    <article class="template-tool">
      <div class="tool-heading">
        <span>03</span>
        <div>
          <h3>Prototype Test Recorder</h3>
          <p>记录原型测试数据，并给出是否进入 CAD 的判断。</p>
        </div>
      </div>
      <form data-tool="prototype">
        <label>原型名称<input name="prototype" placeholder="例如：双滚轮地面拾取原型"></label>
        <label>验证风险<textarea name="risk" rows="2" placeholder="例如：高速接触时是否会弹飞 game piece"></textarea></label>
        <div class="tool-row">
          <label>测试次数<input name="attempts" type="number" min="1" step="1" value="10"></label>
          <label>成功次数<input name="success" type="number" min="0" step="1" value="8"></label>
        </div>
        <label>记录数据<textarea name="data" rows="2" placeholder="速度、电流、命中率、卡料次数、视频编号"></textarea></label>
        <label>失败现象<textarea name="failureMode" rows="2" placeholder="什么时候失败？失败后怎么恢复？"></textarea></label>
        <div class="tool-actions">
          <button type="button" data-generate>生成测试记录</button>
          <button type="button" data-copy>复制结果</button>
          <button type="button" data-download>下载 TXT</button>
        </div>
        <textarea class="tool-output" data-tool-output rows="12" readonly></textarea>
      </form>
    </article>
  </div>
`;

if (templatesSection) {
  templatesSection.innerHTML = toolMarkup;
  templatesSection.querySelectorAll('form[data-tool]').forEach((form) => {
    const type = form.dataset.tool;
    const render = type === 'requirements' ? renderRequirements :
      type === 'interface' ? renderInterface :
      renderPrototype;

    form.querySelector('[data-generate]')?.addEventListener('click', () => render(form));
    form.querySelector('[data-copy]')?.addEventListener('click', (event) => copyOutput(event.currentTarget));
    form.querySelector('[data-download]')?.addEventListener('click', (event) => downloadOutput(event.currentTarget));
    render(form);
  });
}
