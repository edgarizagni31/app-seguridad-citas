import { zodResolver } from '@hookform/resolvers/zod';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { addVisitor, DOCUMENT_TYPES, isValidDocument } from '../../domain';
import { useEntryFlowStore } from '../stores/entry-flow-store';
import { useDependencies } from '@/core/di';
import { STRINGS } from '@/shared/lib';

const { form: TEXT } = STRINGS.entry;
const { errors: ERRORS } = TEXT;

const documentType = z.enum(['DUI', 'PASSPORT', 'RESIDENT_CARD', 'DRIVER_LICENSE']);

const addVisitorSchema = z
  .object({
    name: z.string().trim().min(3, ERRORS.nameRequired).max(120),
    documentType: documentType.nullable().refine((value) => value !== null, ERRORS.typeRequired),
    documentNumber: z.string().trim().min(1, ERRORS.numberRequired),
    role: z.enum(['DRIVER', 'HELPER']),
  })
  .superRefine((form, context) => {
    if (!form.documentType || !form.documentNumber) return;
    if (isValidDocument(form.documentType, form.documentNumber)) return;
    context.addIssue({
      code: 'custom',
      path: ['documentNumber'],
      message: form.documentType === 'DUI' ? ERRORS.duiInvalid : ERRORS.documentInvalid,
    });
  });

export type AddVisitorForm = z.input<typeof addVisitorSchema>;

export const DOCUMENT_OPTIONS = DOCUMENT_TYPES.map((value) => ({
  value,
  label: STRINGS.entry.documentTypes[value],
}));

export function useAddVisitorViewModel() {
  const router = useRouter();
  const { accessControl } = useDependencies();
  const draft = useEntryFlowStore((state) => state.draft);
  const setDraft = useEntryFlowStore((state) => state.setDraft);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const form = useForm<AddVisitorForm>({
    resolver: zodResolver(addVisitorSchema),
    defaultValues: { name: '', documentType: null, documentNumber: '', role: 'HELPER' },
  });

  const onValid = async (values: AddVisitorForm) => {
    setBannerError(null);
    const current = useEntryFlowStore.getState().draft;
    if (!current || !values.documentType) return;
    const visitor = {
      id: Crypto.randomUUID(),
      name: values.name.trim(),
      documentType: values.documentType,
      documentNumber: values.documentNumber.trim(),
      role: values.role,
    };

    const added = addVisitor(current, visitor);
    if (!added.ok) {
      form.setError('documentNumber', { message: ERRORS.duplicate });
      return;
    }
    const check = await accessControl.validateVisitor({ ...visitor, voucherId: current.voucherId });
    if (!check.ok) {
      if (check.error.type === 'blacklisted') {
        setBannerError(check.error.message ?? STRINGS.entry.blacklistedMessage(visitor.name));
      } else if (check.error.type === 'invalid-document') {
        form.setError('documentNumber', { message: ERRORS.documentInvalid });
      } else {
        setBannerError(ERRORS.offlineNoShift);
      }
      return;
    }
    setDraft(added.value);
    router.back();
  };

  return {
    hasDraft: draft !== null,
    form,
    bannerError,
    submit: form.handleSubmit(onValid),
    cancel: () => router.back(),
  };
}
