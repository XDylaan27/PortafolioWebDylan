import { disablePushTopic, enablePushTopic, syncPushTopic, testPushTopic } from '@/lib/push';
export const enableOrderPush = (userId: string) => enablePushTopic(userId, 'orders');
export const syncOrderPush = (userId: string) => syncPushTopic(userId, 'orders');
export const disableOrderPush = () => disablePushTopic('orders');
export const testOrderPush = (userId: string) => testPushTopic(userId, 'orders');
