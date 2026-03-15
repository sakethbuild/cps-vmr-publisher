import { getEnv } from "@/lib/env";
import { MockWordPressPublisher } from "@/lib/wordpress/mock-wordpress-publisher";
import { RealWordPressPublisher } from "@/lib/wordpress/real-wordpress-publisher";

export function getWordPressPublisher() {
  return getEnv().wordpressMode === "real"
    ? new RealWordPressPublisher()
    : new MockWordPressPublisher();
}
