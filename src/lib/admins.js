import { supabase } from '@/lib/supabase';

let adminEmailsRequest = null;

export function getAdminEmails() {
  if (!adminEmailsRequest) {
    adminEmailsRequest = supabase
      .from('announcement_admins')
      .select('user_email')
      .then(({ data, error }) => {
        if (error) {
          adminEmailsRequest = null;
          return [];
        }

        return data?.map(admin => admin.user_email) || [];
      });
  }

  return adminEmailsRequest;
}
