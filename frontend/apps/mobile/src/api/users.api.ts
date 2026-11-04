import { api } from './client';

export function registerPushToken(token: string): Promise<{ message: string }> {
  return api.post('/users/push-token', { token });
}

export function removePushToken(token: string): Promise<{ message: string }> {
  return api.delete('/users/push-token', { body: { token } });
}

export function createSupportTicket(subject: string, message: string) {
  return api.post('/users/support', { subject, message });
}

export function getMySupportTickets() {
  return api.get('/users/support');
}
