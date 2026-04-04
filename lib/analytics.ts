import { Config } from '../constants/config';

type EventProperties = Record<string, string | number | boolean | null | undefined>;

/**
 * Lightweight analytics wrapper.
 * In production, swap console.log calls with PostHog/Segment/etc.
 */
class Analytics {
  private userId: string | null = null;

  identify(userId: string, traits?: EventProperties) {
    this.userId = userId;
    if (Config.isDev) {
      console.log('[Analytics] identify', userId, traits);
    }
    // TODO: posthog.identify(userId, traits)
  }

  track(eventName: string, properties?: EventProperties) {
    if (Config.isDev) {
      console.log('[Analytics] track', eventName, properties);
    }
    // TODO: posthog.capture(eventName, { ...properties, userId: this.userId })
  }

  screen(screenName: string, properties?: EventProperties) {
    if (Config.isDev) {
      console.log('[Analytics] screen', screenName, properties);
    }
    // TODO: posthog.capture('$screen', { $screen_name: screenName, ...properties })
  }

  reset() {
    this.userId = null;
    // TODO: posthog.reset()
  }
}

export const analytics = new Analytics();

// Convenience exports
export const trackEvent = analytics.track.bind(analytics);
export const identifyUser = analytics.identify.bind(analytics);
export const trackScreen = analytics.screen.bind(analytics);
