export function createEvent({ type, entity, entityId, payload }) {
  return {
    type,
    entity,
    entityId,
    payload,
    occurredAt: new Date(),
  };
}

export function createEventDispatcher() {
  const listeners = {};

  function on(eventType, listener) {
    if (!listeners[eventType]) {
      listeners[eventType] = [];
    }
    listeners[eventType].push(listener);
  }

  async function dispatch(event) {
    const eventListeners = listeners[event.type] || [];

    for (const listener of eventListeners) {
      try {
        await listener(event);
      } catch (error) {
        console.error(`[EventDispatcher] Error handling ${event.type}`, error);
      }
    }
  }

  return {
    on,
    dispatch,
  };
}

export const eventDispatcher = createEventDispatcher();
