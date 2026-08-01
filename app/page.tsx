'use client';

import { ChatView } from '@/components/chat/chat-view';
import { useChatController } from '@/hooks/use-chat-controller';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useVisitorId } from '@/hooks/use-visitor-id';

export default function ChatPage() {
  const visitorId = useVisitorId();
  const identity = useCurrentUser();
  const controller = useChatController({
    visitorId,
    identityReady: identity.isReady,
  });
  return <ChatView controller={controller} identity={identity} />;
}
