/**
 * Rule Definitions
 * Contains unified rule structure and predefined rule sets
 */

import { EXTERNAL_ADBLOCK_REIJI_URL, EXTERNAL_ADBLOCK_217_URL, EXTERNAL_GAMING_DIRECT_URL } from './ruleUrls.js';

export const CUSTOM_RULES = [];

export const UNIFIED_RULES = [
	{
		name: '广告拦截',
		site_rules: ['reiji-adblock', '217-adblock'],
		ip_rules: []
	},
	{
		name: '游戏直连',
		site_rules: ['kg-mc'],
		ip_rules: []
	},
	{
		name: 'Google Gemini',
		site_rules: ['google-gemini'],
		ip_rules: []
	},
	{
		name: 'Adobe',
		site_rules: ['adobe'],
		ip_rules: []
	},
	{
		name: 'Ad Block',
		site_rules: ['category-ads-all'],
		ip_rules: []
	},
	{
		name: 'AI Services',
		site_rules: ['category-ai-!cn',],
		ip_rules: []
	},
	{
		name: 'Bilibili',
		site_rules: ['bilibili'],
		ip_rules: []
	},
	{
		name: 'Youtube',
		site_rules: ['youtube'],
		ip_rules: []
	},
	{
		name: 'Google',
		site_rules: ['google'],
		ip_rules: ['google']
	},
	{
		name: 'Private',
		site_rules: [],
		ip_rules: ['private']
	},
	{
		name: 'Location:CN',
		site_rules: ['geolocation-cn', 'cn'],
		ip_rules: ['cn']
	},
	{
		name: 'Telegram',
		site_rules: [],
		ip_rules: ['telegram']
	},
	{
		name: 'Github',
		site_rules: ['github', 'gitlab'],
		ip_rules: []
	},
	{
		name: 'Microsoft',
		site_rules: ['microsoft'],
		ip_rules: []
	},
	{
		name: 'Apple',
		site_rules: ['apple'],
		ip_rules: []
	},
	{
		name: 'Social Media',
		site_rules: ['facebook', 'instagram', 'twitter', 'tiktok', 'linkedin'],
		ip_rules: []
	},
	{
		name: 'Streaming',
		site_rules: ['netflix', 'hulu', 'disney', 'hbo', 'amazon', 'bahamut'],
		ip_rules: []
	},
	{
		name: 'Gaming',
		site_rules: ['steam', 'epicgames', 'ea', 'ubisoft', 'blizzard'],
		ip_rules: []
	},
	{
		name: 'Education',
		site_rules: ['coursera', 'edx', 'udemy', 'khanacademy', 'category-scholar-!cn'],
		ip_rules: []
	},
	{
		name: 'Financial',
		site_rules: ['paypal', 'visa', 'mastercard', 'stripe', 'wise'],
		ip_rules: []
	},
	{
		name: 'Cloud Services',
		site_rules: ['aws', 'azure', 'digitalocean', 'heroku', 'dropbox'],
		ip_rules: []
	},
	{
		name: 'Non-China',
		site_rules: ['geolocation-!cn'],
		ip_rules: []
	}
];

// Rule names that should default to DIRECT instead of Node Select
export const DIRECT_DEFAULT_RULES = new Set(['Private', 'Location:CN', '游戏直连']);

// Rule names that should default to REJECT (Block) instead of Node Select
export const REJECT_DEFAULT_RULES = new Set(['广告拦截']);

export const PREDEFINED_RULE_SETS = {
	minimal: ['Location:CN', 'Private', 'Non-China'],
	balanced: ['广告拦截', '游戏直连', 'Google Gemini', 'Adobe', 'Location:CN', 'Private', 'Non-China', 'Github', 'Google', 'Youtube', 'AI Services', 'Telegram'],
	comprehensive: UNIFIED_RULES.map(rule => rule.name)
};

// Generate SITE_RULE_SETS and IP_RULE_SETS from UNIFIED_RULES
export const SITE_RULE_SETS = UNIFIED_RULES.reduce((acc, rule) => {
	rule.site_rules.forEach(site_rule => {
		if (site_rule === 'reiji-adblock') {
			acc[site_rule] = EXTERNAL_ADBLOCK_REIJI_URL;
		} else if (site_rule === '217-adblock') {
			acc[site_rule] = EXTERNAL_ADBLOCK_217_URL;
		} else if (site_rule === 'kg-mc') {
			acc[site_rule] = {
				url: EXTERNAL_GAMING_DIRECT_URL,
				download_detour: 'outboundNames.Auto Select'
			};
		} else {
			acc[site_rule] = `geosite-${site_rule}.srs`;
		}
	});
	return acc;
}, {});

export const IP_RULE_SETS = UNIFIED_RULES.reduce((acc, rule) => {
	rule.ip_rules.forEach(ip_rule => {
		acc[ip_rule] = `geoip-${ip_rule}.srs`;
	});
	return acc;
}, {});

// Generate CLASH_SITE_RULE_SETS and CLASH_IP_RULE_SETS for .mrs format
export const CLASH_SITE_RULE_SETS = UNIFIED_RULES.reduce((acc, rule) => {
	rule.site_rules.forEach(site_rule => {
		acc[site_rule] = `${site_rule}.mrs`;
	});
	return acc;
}, {});

export const CLASH_IP_RULE_SETS = UNIFIED_RULES.reduce((acc, rule) => {
	rule.ip_rules.forEach(ip_rule => {
		acc[ip_rule] = `${ip_rule}.mrs`;
	});
	return acc;
}, {});
