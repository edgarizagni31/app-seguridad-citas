import { z } from 'zod';

import type { Site, SitesError, SitesGateway } from '../domain';
import { err, ok } from '@/shared/domain';
import type { HttpClient, HttpError } from '@/shared/infrastructure';

// GET operation/UserHeadquarter/ListUserHeadquarterByUserId (mismo endpoint que el portal web)
const userHeadquartersSchema = z.object({
  userHeadquarterList: z.array(
    z.object({
      headquarterId: z.string(),
      headquarterTypeDescription: z.string().nullish(),
    }),
  ),
});

const toSitesError = (error: HttpError): SitesError => {
  if (error.type === 'network' || error.type === 'timeout') return { type: 'network' };
  if (error.type === 'unauthorized') return { type: 'unauthorized' };
  return { type: 'unknown', cause: error };
};

export function createCitasSitesGateway(http: HttpClient): SitesGateway {
  return {
    async listMySites() {
      const result = await http.request({
        method: 'GET',
        url: 'operation/UserHeadquarter/ListUserHeadquarterByUserId',
        schema: userHeadquartersSchema,
        unwrapEnvelope: true,
      });
      if (!result.ok) return err(toSitesError(result.error));

      const sites = new Map<string, Site>();
      for (const headquarter of result.value.userHeadquarterList) {
        const name = headquarter.headquarterTypeDescription?.trim();
        if (name && !sites.has(headquarter.headquarterId)) {
          sites.set(headquarter.headquarterId, { id: headquarter.headquarterId, name });
        }
      }
      return ok([...sites.values()].sort((a, b) => a.name.localeCompare(b.name, 'es')));
    },
  };
}
