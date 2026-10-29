import type { InspectionGateway, InspectionProtocol, ProtocolQuestion } from '../domain';
import { err, ok } from '@/shared/domain';

import { buildDemoProtocol } from './demo-protocol';

type MockOptions = {
  readonly isOnline: () => Promise<boolean>;
  readonly latencyMs?: number;
};

type Saved = ProtocolQuestion['saved'];

// Simula GetInspectionProtocol/ExecuteInspectionProtocol: conformidad por opción y respuestas guardadas
export function createMockInspectionGateway({
  isOnline,
  latencyMs = 350,
}: MockOptions): InspectionGateway {
  const delay = () => new Promise((resolve) => setTimeout(resolve, latencyMs));
  const saved = new Map<string, Map<string, Saved>>();
  const keyOf = (voucherId: string, unitId: string) => `${voucherId}:${unitId}`;

  return {
    async getProtocol(voucherId, unitId) {
      await delay();
      if (!(await isOnline())) return err({ type: 'network' });
      const protocol = buildDemoProtocol();
      const answers = saved.get(keyOf(voucherId, unitId));
      if (!answers) return ok(protocol);
      return ok({
        ...protocol,
        responseId: `response-${keyOf(voucherId, unitId)}`,
        questions: protocol.questions.map((question) => ({
          ...question,
          saved: answers.get(question.id) ?? question.saved,
        })),
      } satisfies InspectionProtocol);
    },
    async execute(request) {
      await delay();
      if (!(await isOnline())) return err({ type: 'network' });
      const questions = new Map(buildDemoProtocol().questions.map((q) => [q.id, q]));
      const answers = new Map<string, Saved>();
      const nonCompliant: string[] = [];
      for (const answer of request.answers) {
        const question = questions.get(answer.questionId);
        const option = question?.options.find((candidate) => candidate.id === answer.optionId);
        if (question && option?.nonCompliant)
          nonCompliant.push(`${question.title}: ${option.name}`);
        answers.set(answer.questionId, {
          status: answer.status,
          optionId: answer.optionId,
          evidenceUrl: answer.photo ? `https://demo.ransa/evidencias/${answer.photo.id}.jpg` : null,
        });
      }
      saved.set(keyOf(request.voucherId, request.unitId), answers);
      return ok({ type: 'accepted', compliant: nonCompliant.length === 0, nonCompliant });
    },
  };
}
