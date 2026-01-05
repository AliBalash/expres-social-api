import { Bundlesocial } from 'bundlesocial';
import env from '../config/env';

/**
 * Shared Bundle.social SDK instance so every controller
 * talks to the same authenticated client.
 */
const bundleClient = new Bundlesocial(env.apiKey);

export default bundleClient;
