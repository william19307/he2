const OPERATORS = {
  '>=': (a, b) => a >= b,
  '<=': (a, b) => a <= b,
  '>':  (a, b) => a > b,
  '<':  (a, b) => a < b,
  '==': (a, b) => a == b,  // eslint-disable-line eqeqeq
  '===': (a, b) => a === b,
  '!=': (a, b) => a != b,  // eslint-disable-line eqeqeq
};

function evaluateCondition(value, condition) {
  const match = condition.match(/^value\s*(>=|<=|>|<|===|==|!=)\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) {
    throw new Error(`Invalid alert condition: ${condition}`);
  }
  const [, operator, threshold] = match;
  return OPERATORS[operator](value, Number(threshold));
}

/** scoring_rule 为 null 或未配置 method 时，按选项分直接累加（sum） */
function getScoringMethod(scale) {
  const rule = scale?.scoringRule ?? scale?.scoring_rule;
  if (rule == null || typeof rule !== 'object') return 'sum';
  return rule.method || 'sum';
}

function findAnswerForQuestion(answers, question) {
  const qid = question.id;
  const qno = question.questionNo;
  return answers.find(
    (a) =>
      a.question_id === qid ||
      a.question_id === Number(qid) ||
      String(a.question_id) === String(qid) ||
      a.question_no === qno ||
      Number(a.question_no) === Number(qno)
  );
}

export class ScoreEngine {
  getOptionScore(question, answer) {
    if (!answer || answer.value == null) return 0;
    if (question.options && Array.isArray(question.options)) {
      const opt = question.options.find(
        (o) => o.value === answer.value || Number(o.value) === Number(answer.value)
      );
      return opt?.score ?? 0;
    }
    return Number(answer.value) || 0;
  }

  getMaxOptionScore(question) {
    if (!question.options || !Array.isArray(question.options)) return 0;
    return Math.max(...question.options.map((o) => o.score ?? 0));
  }

  calculateTotalScore(scale, questions, answers) {
    const method = getScoringMethod(scale);
    if (method !== 'sum') {
      throw new Error(`暂不支持的计分方式: ${method}（当前仅实现 sum：各题选中项 options.score 相加）`);
    }
    let total = 0;
    for (const question of questions) {
      const answer = findAnswerForQuestion(answers, question);
      const raw = this.getOptionScore(question, answer);
      const maxScore = this.getMaxOptionScore(question);
      const rev = question.reverseScore === true || question.reverseScore === 1;
      const score = rev ? (maxScore - raw) : raw;
      total += score;
    }
    return total;
  }

  calculateSubscaleScores(questions, answers) {
    const subscaleMap = {};
    for (const question of questions) {
      if (!question.subscaleKey) continue;
      if (!subscaleMap[question.subscaleKey]) {
        subscaleMap[question.subscaleKey] = 0;
      }
      const answer = findAnswerForQuestion(answers, question);
      const raw = this.getOptionScore(question, answer);
      const maxScore = this.getMaxOptionScore(question);
      const rev = question.reverseScore === true || question.reverseScore === 1;
      const score = rev ? (maxScore - raw) : raw;
      subscaleMap[question.subscaleKey] += score;
    }
    return subscaleMap;
  }

  matchResultLevel(resultLevels, totalScore) {
    if (!Array.isArray(resultLevels)) return null;
    for (const rule of resultLevels) {
      if (totalScore >= rule.range[0] && totalScore <= rule.range[1]) {
        return rule;
      }
    }
    return null;
  }

  checkAlertTriggers(scale, questions, answers, totalScore) {
    const triggers = [];

    const resultLevel = this.matchResultLevel(scale.resultLevels, totalScore);
    if (resultLevel?.alert) {
      triggers.push({
        type: 'total_score',
        level: resultLevel.alert,
        reason: `${scale.name}总分${totalScore}分，属于「${resultLevel.label}」`,
      });
    }

    const alertRules = scale.alertRules;
    if (alertRules?.item_rules) {
      for (const itemRule of alertRules.item_rules) {
        const answer = answers.find(
          (a) =>
            a.question_no === itemRule.question_no ||
            Number(a.question_no) === Number(itemRule.question_no)
        );
        if (answer && evaluateCondition(Number(answer.value), itemRule.condition)) {
          triggers.push({
            type: 'item_rule',
            level: itemRule.alert,
            reason: itemRule.reason,
          });
        }
      }
    }

    return triggers;
  }

  process(scale, questions, answers) {
    const totalScore = this.calculateTotalScore(scale, questions, answers);
    const subscaleScores = this.calculateSubscaleScores(questions, answers);
    const resultLevel = this.matchResultLevel(scale.resultLevels, totalScore);
    const alerts = this.checkAlertTriggers(scale, questions, answers, totalScore);

    const highestAlert = alerts.reduce((highest, t) => {
      if (t.level === 'red') return 'red';
      if (t.level === 'yellow' && highest !== 'red') return 'yellow';
      return highest;
    }, null);

    return {
      totalScore,
      subscaleScores,
      resultLevel: resultLevel?.level ?? 'unknown',
      resultLabel: resultLevel?.label ?? '未知',
      resultDetail: { resultLevel, subscaleScores },
      alerts,
      highestAlert,
    };
  }
}

export default new ScoreEngine();
