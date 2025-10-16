--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.5 (Ubuntu 17.5-1.pgdg22.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at) FROM stdin;
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid) FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.schema_migrations (version) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag) FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
\.


--
-- Data for Name: ai_memories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_memories (id, user_id, expert_id, content, version, last_updated, created_at) FROM stdin;
0e764dfd-919d-4451-b244-35505a1947c9	1b53754a-4131-45e6-86f7-ff8b01067456	general	新记忆内容：用户表示近期长时间缺乏锻炼，当前活动水平“中度活跃”可能需重新评估。未来运动建议需从低强度、循序渐进的方式开始。\n更新原因：了解用户当前真实活动状态，以便提供更安全、有	3	2025-06-19 19:26:54.537+00	2025-06-19 19:27:12.379117+00
\.


--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
\.


--
-- Data for Name: daily_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.daily_logs (id, user_id, date, log_data, last_modified) FROM stdin;
e5a709fe-7447-4d0a-ac00-f0c8b453c937	1b53754a-4131-45e6-86f7-ff8b01067456	2025-06-18	{"weight": 74.3, "calculatedBMR": 1661, "calculatedTDEE": 2574, "deletedFoodIds": [], "conversation_count": 0, "deletedExerciseIds": []}	2025-06-19 11:11:36.052+00
5b128c4b-ec69-4c67-88d0-6855f7a1edab	1b53754a-4131-45e6-86f7-ff8b01067456	2025-06-15	{"weight": 71, "calculatedBMR": 1628, "calculatedTDEE": 2523, "deletedFoodIds": [], "deletedExerciseIds": []}	2025-06-19 11:11:20.349+00
f7ec71ae-52c0-4f6f-b0eb-0f9f5cca8e0c	1b53754a-4131-45e6-86f7-ff8b01067456	2025-06-17	{"weight": 73, "calculatedBMR": 1648, "calculatedTDEE": 2554, "deletedFoodIds": [], "deletedExerciseIds": []}	2025-06-19 11:11:26.656+00
33f0112b-6878-441f-8a34-2c01a9e71ecc	1b53754a-4131-45e6-86f7-ff8b01067456	2025-06-20	{"summary": {"macros": {"fat": 6.05, "carbs": 0.605, "protein": 7.15}, "micronutrients": {}, "totalCaloriesBurned": 0, "totalCaloriesConsumed": 85.25}, "foodEntries": [{"log_id": "99b99656-f597-4e63-8902-a1cef6e0d4e8", "food_name": "鸡蛋", "meal_type": "breakfast", "time_period": "morning", "is_estimated": true, "consumed_grams": 55, "nutritional_info_per_100g": {"fat": 11, "protein": 13, "calories": 155, "carbohydrates": 1.1}, "total_nutritional_info_consumed": {"fat": 6.05, "protein": 7.15, "calories": 85.25, "carbohydrates": 0.605}}], "deletedFoodIds": [], "exerciseEntries": [], "deletedExerciseIds": []}	2025-06-19 20:29:23.088+00
f0f90d08-13e6-4bad-8d3e-64514912b6eb	1b53754a-4131-45e6-86f7-ff8b01067456	2025-06-19	{"weight": 73, "summary": {"macros": {"fat": 26.05, "carbs": 18.105, "protein": 52.15}, "micronutrients": {"fiber": 6.25}, "totalCaloriesBurned": 676.6, "totalCaloriesConsumed": 385.25}, "dailyStatus": {"mood": 4, "health": 4, "stress": 3, "bedTime": "23:00", "wakeTime": "09:00", "moodNotes": "", "sleepNotes": "", "healthNotes": "", "stressNotes": "", "sleepQuality": 4}, "foodEntries": [{"log_id": "8f4e5e1d-3a1f-4310-aee9-7ef5b2f076ba", "food_name": "鸡蛋", "meal_type": "breakfast", "time_period": "morning", "is_estimated": true, "consumed_grams": 55, "nutritional_info_per_100g": {"fat": 11, "fiber": 0, "protein": 13, "calories": 155, "is_estimated": false, "carbohydrates": 1.1}, "total_nutritional_info_consumed": {"fat": 6.05, "fiber": 0, "protein": 7.15, "calories": 85.25, "is_estimated": true, "carbohydrates": 0.605}}, {"log_id": "d617d51a-4c56-4ef5-8285-6a4be5042e84", "food_name": "鸡胸肉沙拉", "meal_type": "lunch", "time_period": "noon", "is_estimated": true, "consumed_grams": 250, "nutritional_info_per_100g": {"fat": 8, "fiber": 2.5, "protein": 18, "calories": 120, "carbohydrates": 7}, "total_nutritional_info_consumed": {"fat": 20, "fiber": 6.25, "protein": 45, "calories": 300, "carbohydrates": 17.5}}], "activityLevel": "light", "calculatedBMR": 1648, "calculatedTDEE": 1977, "deletedFoodIds": ["0a40cf61-00bb-4984-adc4-c67954c4951c", "0a40cf61-00bb-4984-adc4-c67954c4951c", "640792ce-e9f0-4eed-83ae-893945ec7893"], "exerciseEntries": [{"log_id": "1286aca6-97d1-4802-b07a-9b3d7cdf0bc2", "distance_km": 6, "time_period": "evening", "user_weight": 70, "is_estimated": true, "exercise_name": "跑步", "exercise_type": "cardio", "muscle_groups": ["腿部", "核心"], "estimated_mets": 8, "duration_minutes": 40, "calories_burned_estimated": 373.3}, {"reps": 10, "sets": 3, "log_id": "391f924c-14ec-4064-a423-8fad8d2be7a2", "weight_kg": 50, "time_period": "evening", "user_weight": 70, "is_estimated": true, "exercise_name": "无氧训练", "exercise_type": "strength", "muscle_groups": ["全身"], "estimated_mets": 3, "duration_minutes": 20, "calories_burned_estimated": 70}, {"log_id": "f9563498-fd0d-4fbf-a631-a41c00fab4a0", "distance_km": 5, "time_period": "evening", "user_weight": 70, "is_estimated": true, "exercise_name": "椭圆机", "exercise_type": "cardio", "muscle_groups": ["腿部", "手臂", "核心"], "estimated_mets": 5, "duration_minutes": 40, "calories_burned_estimated": 233.3}], "conversation_count": 17, "deletedExerciseIds": []}	2025-06-19 20:30:56.520454+00
7bad5f9b-4588-4093-90ed-2acb437d5025	1d3b3606-f918-4454-9338-58d5d6621aab	2025-06-19	{"conversation_count": 4}	2025-06-19 18:27:23.161354+00
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: invite_codes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invite_codes (id, code, created_by, used_by, expires_at, is_active, created_at, used_at, description) FROM stdin;
91504c8e-d8f4-4918-8073-81af4d0ecd55	NZE4-3QNM-NSDX	1b53754a-4131-45e6-86f7-ff8b01067456	1d3b3606-f918-4454-9338-58d5d6621aab	\N	f	2025-06-19 16:15:23.902+00	2025-06-19 16:16:45.194648+00	Batch 2025/6/20 #1
9f385b4c-20df-4218-9389-c12bac2ae5e9	YVMB-8ADV-96B8	1d3b3606-f918-4454-9338-58d5d6621aab	\N	\N	t	2025-06-19 16:46:33.129+00	\N	Batch 2025/6/20 #2
789d691e-2844-4a65-bfcf-96e7c7de82a4	47J6-26GQ-GT8P	1d3b3606-f918-4454-9338-58d5d6621aab	\N	\N	t	2025-06-19 16:46:33.129+00	\N	Batch 2025/6/20 #3
602225ed-5aee-46c1-9794-b85bcddca3a0	YYZA-89SM-S7GQ	1d3b3606-f918-4454-9338-58d5d6621aab	87f5ccfd-e983-49cd-8e72-891f7cab9660	\N	f	2025-06-19 16:46:33.129+00	2025-06-19 18:38:38.470289+00	Batch 2025/6/20 #1
\.


--
-- Data for Name: invite_configs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invite_configs (id, user_id, interval_days, codes_per_batch, max_total_codes, is_active, created_at, updated_at, created_by) FROM stdin;
e0cb584e-ec7c-414d-95d7-9c3d0f1832a0	1b53754a-4131-45e6-86f7-ff8b01067456	1	10	1000	f	2025-06-18 22:16:19.336157+00	2025-06-19 16:39:00.255+00	1b53754a-4131-45e6-86f7-ff8b01067456
d46dad0e-617b-4f3f-8af0-8da4b1cd1178	1b53754a-4131-45e6-86f7-ff8b01067456	1	50	50	t	2025-06-19 16:39:00.255+00	2025-06-19 16:39:00.255+00	1b53754a-4131-45e6-86f7-ff8b01067456
89ad23d5-224f-4dae-8b37-f994121f0d75	\N	7	1	5	f	2025-06-19 16:39:21.338+00	2025-06-19 16:45:39.722+00	1b53754a-4131-45e6-86f7-ff8b01067456
dd475fff-4fe1-4c2b-8be8-91e52332fe23	\N	7	1	3	f	2025-06-19 16:44:10.405+00	2025-06-19 16:45:39.722+00	1b53754a-4131-45e6-86f7-ff8b01067456
4d8f3b16-a8c1-411e-ac7b-9c02ad73d809	\N	999	3	3	t	2025-06-19 16:45:39.722+00	2025-06-19 16:45:39.722+00	1b53754a-4131-45e6-86f7-ff8b01067456
\.


--
-- Data for Name: ip_bans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ip_bans (id, ip_address, reason, severity, banned_at, expires_at, is_active, ban_type, metadata, created_by, unbanned_at, unban_reason, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.schema_migrations (version) FROM stdin;
\.


--
-- Data for Name: security_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.security_events (id, user_id, ip_address, user_agent, event_type, severity, description, metadata, created_at) FROM stdin;
9abafda5-85f2-4734-8e8f-4e9238b2f405	1b53754a-4131-45e6-86f7-ff8b01067456	::1	\N	system_maintenance	medium	管理员 Feather-2 更新了用户 1d3b3606-f918-4454-9338-58d5d6621aab 的信息	{"changes": {"role": "user", "is_active": true, "is_silenced": false, "trust_level": 2}, "target_user_id": "1d3b3606-f918-4454-9338-58d5d6621aab"}	2025-06-19 17:14:41.417474+00
43d1ab47-0481-40f1-8fa2-e6f3c6a0fd57	1b53754a-4131-45e6-86f7-ff8b01067456	::1	\N	system_maintenance	medium	管理员 Feather-2 更新了用户 1d3b3606-f918-4454-9338-58d5d6621aab 的信息	{"changes": {"role": "user", "is_active": true, "is_silenced": false, "trust_level": 3}, "target_user_id": "1d3b3606-f918-4454-9338-58d5d6621aab"}	2025-06-19 17:14:56.794479+00
e5f9fb65-06e5-4675-b510-2e9938abe4dd	1b53754a-4131-45e6-86f7-ff8b01067456	::1	\N	system_maintenance	medium	超级管理员 Feather-2 更新了系统配置	{"updated_keys": ["maintenance_mode", "registration_enabled", "require_invite_code", "max_daily_usage", "default_trust_level", "system_message"]}	2025-06-19 17:36:41.040993+00
46b3c094-8042-4d84-ac56-31cc1c745a2f	1b53754a-4131-45e6-86f7-ff8b01067456	::1	\N	system_maintenance	medium	超级管理员 Feather-2 更新了系统配置	{"updated_keys": ["maintenance_mode", "registration_enabled", "require_invite_code", "max_daily_usage", "default_trust_level", "system_message"]}	2025-06-19 18:35:27.88694+00
fd5b4cdb-6d19-46c5-8aae-cce66e02d6f8	1b53754a-4131-45e6-86f7-ff8b01067456	::1	\N	system_maintenance	medium	超级管理员 Feather-2 更新了系统配置	{"updated_keys": ["maintenance_mode", "registration_enabled", "require_invite_code", "max_daily_usage", "default_trust_level", "system_message"]}	2025-06-19 18:35:59.950278+00
c4616f8f-5209-4a6e-adb5-28a6631e6c54	\N	0.0.0.0	\N	system_maintenance	low	Marked old AI memories with time warning	{"automated": true, "operation": "mark_old_memories", "marked_count": 1, "scheduled_at": "2025-06-19T21:04:08.873607+00:00"}	2025-06-19 21:04:08.873607+00
cc33a1a9-2f6e-42b8-8200-07f373371a56	\N	0.0.0.0	\N	system_maintenance	low	Refreshed AI memory markers for recently updated memories	{"automated": true, "operation": "refresh_memory_markers", "scheduled_at": "2025-06-19T21:04:09.412585+00:00", "refreshed_count": 1}	2025-06-19 21:04:09.412585+00
\.


--
-- Data for Name: security_events_backup_20250610_173749; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.security_events_backup_20250610_173749 (id, event_type, user_id, shared_key_id, severity, details, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: shared_keys; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shared_keys (id, user_id, name, base_url, api_key_encrypted, daily_limit, description, tags, is_active, usage_count_today, total_usage_count, last_used_at, created_at, updated_at, available_models) FROM stdin;
c6bb6c53-b2de-4322-be24-c0ed5f631272	1b53754a-4131-45e6-86f7-ff8b01067456	sbs	https://apihub.asdmyasdon.sbs	U2FsdGVkX1/cUo+px0lQrOTr3ea0eSXOYa6CGmeuaUG1D4uFVucl4jWL5sP+WuRUfTPz8vq4baM8rcUWdcZJuz5FwSEvWBg3g1Fb/HMnSFs=	150		{官方}	t	30	30	2025-06-19 20:30:49.031	2025-06-19 10:07:46.685872	2025-06-19 21:12:15.741	{BAAI/bge-en-icl,BAAI/bge-large-en-v1.5,BAAI/bge-large-zh-v1.5,BAAI/bge-m3,BAAI/bge-multilingual-gemma2,BAAI/bge-reranker-v2-m3,DeepSeek-R1-Distill-Llama-70b,DeepSeek-R1-Distill-Qwen-32B,FunAudioLLM/SenseVoiceSmall,Kwai-Kolors/Kolors,Llama-4-Maverick-17B-128E,Llama-4-Scout-17B-16E,NousResearch/Hermes-3-Llama-405B,Qwen/QwQ-32B,Qwen/QwQ-32B-fast,Qwen/Qwen2-1.5B-Instruct,Qwen/Qwen2-7B-Instruct,Qwen/Qwen2-VL-72B-Instruct,Qwen/Qwen2.5-32B-Instruct,Qwen/Qwen2.5-32B-Instruct-fast,Qwen/Qwen2.5-72B-Instruct,Qwen/Qwen2.5-72B-Instruct-fast,Qwen/Qwen2.5-7B-Instruct,Qwen/Qwen2.5-Coder-32B-Instruct,Qwen/Qwen2.5-Coder-32B-Instruct-fast,Qwen/Qwen2.5-Coder-7B,Qwen/Qwen2.5-Coder-7B-Instruct,Qwen/Qwen2.5-Coder-7B-fast,Qwen/Qwen2.5-VL-72B-Instruct,Qwen/Qwen3-14B,Qwen/Qwen3-235B-A22B,Qwen/Qwen3-235B-A22B-FP8,Qwen/Qwen3-30B-A3B,Qwen/Qwen3-30B-A3B-fast,Qwen/Qwen3-32B,Qwen/Qwen3-32B-FP8,Qwen/Qwen3-32B-fast,Qwen/Qwen3-4B-fast,Qwen/Qwen3-8B,THUDM/GLM-4-9B-0414,THUDM/GLM-Z1-9B-0414,THUDM/chatglm3-6b,THUDM/glm-4-9b-chat,aaditya/Llama3-OpenBioLLM-70B,aqa,black-forest-labs/flux-dev,black-forest-labs/flux-schnell,chatgpt-4o-latest,claude-3-5-sonnet-20240620,claude-3-5-sonnet-20241022,claude-3-7-sonnet-20250219,claude-3-7-sonnet-20250219-thinking,claude-3-sonnet-20240229,claude-4-opus-20250514,claude-4-opus-20250514-thinking,claude-4-sonnet,claude-4-sonnet-20250514,claude-4-sonnet-20250514-thinking,command,command-a-03-2025,command-r,command-r-plus,command-r-plus-08-2024,deepseek-ai/DeepSeek-Prover-V2-671B,deepseek-ai/DeepSeek-R1,deepseek-ai/DeepSeek-R1-0528,deepseek-ai/DeepSeek-R1-0528-Qwen3-8B,deepseek-ai/DeepSeek-R1-Distill-Llama-70B,deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B,deepseek-ai/DeepSeek-R1-Distill-Qwen-14B,deepseek-ai/DeepSeek-R1-Distill-Qwen-32B,deepseek-ai/DeepSeek-R1-Distill-Qwen-7B,deepseek-ai/DeepSeek-R1-fast,deepseek-ai/DeepSeek-V3,deepseek-ai/DeepSeek-V3-0324,deepseek-ai/DeepSeek-V3-0324-fast,deepseek-prover-v2,deepseek-r1,deepseek-r1-0528,deepseek-r1-zero,deepseek-v3,deepseek-v3-0324,embedding-001,embedding-gecko-001,gemini-1.0-pro-vision-latest,gemini-1.5-flash,gemini-1.5-flash-001,gemini-1.5-flash-001-tuning,gemini-1.5-flash-002,gemini-1.5-flash-8b,gemini-1.5-flash-8b-001,gemini-1.5-flash-8b-exp-0827,gemini-1.5-flash-8b-exp-0924,gemini-1.5-flash-8b-latest,gemini-1.5-flash-latest,gemini-1.5-pro,gemini-1.5-pro-001,gemini-1.5-pro-002,gemini-1.5-pro-exp-0801,gemini-1.5-pro-exp-0827,gemini-1.5-pro-latest,gemini-2.0-flash,gemini-2.0-flash-001,gemini-2.0-flash-biaobiao,gemini-2.0-flash-exp,gemini-2.0-flash-exp-1219,gemini-2.0-flash-exp-image,gemini-2.0-flash-exp-image-generation,gemini-2.0-flash-lite,gemini-2.0-flash-lite-001,gemini-2.0-flash-lite-preview,gemini-2.0-flash-lite-preview-02-05,gemini-2.0-flash-live-001,gemini-2.0-flash-preview-image-generation,gemini-2.0-flash-thinking-exp,gemini-2.0-flash-thinking-exp-01-21,gemini-2.0-flash-thinking-exp-1219,gemini-2.0-pro-exp,gemini-2.0-pro-exp-02-05,gemini-2.5-flash,gemini-2.5-flash-exp-native-audio-thinking-dialog,gemini-2.5-flash-preview-04-17,gemini-2.5-flash-preview-04-17-search-preview,gemini-2.5-flash-preview-04-17-thinking,gemini-2.5-flash-preview-05-20,gemini-2.5-flash-preview-05-20-search-preview,gemini-2.5-flash-preview-05-20-thinking,gemini-2.5-flash-preview-native-audio-dialog,gemini-2.5-flash-preview-native-audio-dialog-rai-v3,gemini-2.5-flash-preview-tts,gemini-2.5-pro-exp-03-25,gemini-2.5-pro-exp-03-25-search-preview,gemini-2.5-pro-exp-03-25-thinking,gemini-2.5-pro-preview-03-25,gemini-2.5-pro-preview-03-25-search-preview,gemini-2.5-pro-preview-03-25-thinking,gemini-2.5-pro-preview-05-06,gemini-2.5-pro-preview-05-06-search,gemini-2.5-pro-preview-05-06-search-preview,gemini-2.5-pro-preview-05-06-thinking,gemini-2.5-pro-preview-06-05,gemini-2.5-pro-preview-06-05-search-preview,gemini-2.5-pro-preview-06-05-thinking,gemini-2.5-pro-preview-tts,gemini-embedding-exp,gemini-embedding-exp-03-07,gemini-exp-1114,gemini-exp-1121,gemini-exp-1206,gemini-pro-vision,gemma-3-12b-it,gemma-3-1b-it,gemma-3-27b-it,gemma-3-4b-it,gemma-3n-e4b-it,gemma2-9b-it,google/gemma-2-2b-it,google/gemma-2-9b-it-fast,google/gemma-3-27b-it,google/gemma-3-27b-it-fast,gpt-3.5-turbo,gpt-35-turbo,gpt-4,gpt-4-turbo,gpt-4.1,gpt-4.1-mini,gpt-4.1-nano,gpt-41,gpt-41-mini,gpt-41-nano,gpt-45-preview,gpt-4o,gpt-4o-all,gpt-4o-mini,grok-3,grok-3-deepsearch,grok-3-deepsearch-reason,grok-3-image,grok-3-reason,imagen-3.0-generate-002,internlm/internlm2_5-7b-chat,intfloat/e5-mistral-7b-instruct,kingfall-ab-test,laion/CLIP-ViT-B-32-laion2B-s34B-b79K,learnlm-2.0-flash-experimental,llama-3.1-8b-instant,llama-3.2-90b-text-preview,llama-3.2-90b-vision-preview,llama-3.3-70b-specdec,llama-3.3-70b-versatile,llama3-70b-8192,llama3-8b-8192,meta-llama/Llama-3.3-70B-Instruct,meta-llama/Llama-3.3-70B-Instruct-fast,meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8,meta-llama/Llama-4-Scout-17B-16E-Instruct,meta-llama/Llama-Guard-3-8B,meta-llama/Meta-Llama-3.1-405B-Instruct,meta-llama/Meta-Llama-3.1-70B-Instruct,meta-llama/Meta-Llama-3.1-8B-Instruct,meta-llama/Meta-Llama-3.1-8B-Instruct-fast,microsoft/phi-4,mistral-large-latest,mistralai/Mistral-Nemo-Instruct-2407,mistralai/Mistral-Small-3.1-24B-Instruct-2503,mixtral-8x7b-32768,netease-youdao/bce-embedding-base_v1,netease-youdao/bce-reranker-base_v1,nvidia/Llama-3_1-Nemotron-Ultra-253B-v1,nvidia/Llama-3_3-Nemotron-Super-49B-v1,o1,o1-mini,o3,o3-mini,o4-mini,qwen-qwq-32b,qwen3-235b-a22b,stability-ai/sdxl,test-model,text-embedding-004,text-embedding-3-large,text-embedding-3-small,veo-2.0-generate-001}
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sso_providers (id, resource_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: system_configs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_configs (key, value, description, updated_by, updated_at, created_at) FROM stdin;
maintenance_mode	false	\N	1b53754a-4131-45e6-86f7-ff8b01067456	2025-06-19 18:35:45.369+00	2025-06-19 17:36:39.838447+00
registration_enabled	true	\N	1b53754a-4131-45e6-86f7-ff8b01067456	2025-06-19 18:35:45.369+00	2025-06-19 17:36:40.054238+00
require_invite_code	true	\N	1b53754a-4131-45e6-86f7-ff8b01067456	2025-06-19 18:35:45.369+00	2025-06-19 17:36:40.271463+00
max_daily_usage	150	\N	1b53754a-4131-45e6-86f7-ff8b01067456	2025-06-19 18:35:45.369+00	2025-06-19 17:36:40.48949+00
default_trust_level	0	\N	1b53754a-4131-45e6-86f7-ff8b01067456	2025-06-19 18:35:45.369+00	2025-06-19 17:36:40.70596+00
system_message	""	\N	1b53754a-4131-45e6-86f7-ff8b01067456	2025-06-19 18:35:45.369+00	2025-06-19 17:36:40.922431+00
\.


--
-- Data for Name: user_bans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_bans (id, user_id, reason, severity, banned_at, expires_at, is_active, ban_type, metadata, created_by, unbanned_at, unban_reason, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_profiles (id, user_id, weight, height, age, gender, activity_level, goal, target_weight, target_calories, notes, professional_mode, medical_history, lifestyle, health_awareness, created_at, updated_at) FROM stdin;
494347ac-5bac-42f7-b208-544245f071ff	1b53754a-4131-45e6-86f7-ff8b01067456	72.00	182.00	30	male	moderate	maintain	\N	\N	\N	f	\N	\N	\N	2025-06-19 16:04:21.522291+00	2025-06-19 16:09:45.498851+00
e479170c-3561-478a-85ef-3eff0045c79b	1d3b3606-f918-4454-9338-58d5d6621aab	77.00	170.00	30	male	moderate	maintain	80.00	2000	123	t	321	222	333	2025-06-19 16:20:12.034203+00	2025-06-19 16:19:58.154+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, linux_do_id, username, avatar_url, email, created_at, updated_at, display_name, trust_level, is_active, is_silenced, last_login_at, login_count, role, permissions, password_hash, email_verified, email_verification_token, password_reset_token, password_reset_expires, provider_id, provider_type) FROM stdin;
1b53754a-4131-45e6-86f7-ff8b01067456	\N	Feather-2	https://avatars.githubusercontent.com/u/46832544?v=4	gh347@163.com	2025-06-18 22:16:19.336157	2025-06-19 17:06:52.908	Wing	4	t	f	2025-06-19 11:50:39.99	4	super_admin	[]	$2b$12$PXFlhBoi38ikXxrfKVUnpOMfSTfNAAHW0IP8niKw52nNfGZ6Gubo2	f	\N	\N	\N	46832544	github
1d3b3606-f918-4454-9338-58d5d6621aab	\N	vcdfhkkitedfhj	\N	vcdfhkkitedfhj@gmail.com	2025-06-19 16:16:45.194648	2025-06-19 17:14:42.754	vcd	3	t	f	2025-06-19 18:38:02.483	3	user	[]	$2b$12$NXLKe3Ay7MxieSWTYOhsIemMJ2PnWu/IIg0g5kIEu5TV/g02WhZcm	t	\N	\N	\N	\N	credentials
87f5ccfd-e983-49cd-8e72-891f7cab9660	\N	ding	\N	arleneacurrenm87@gmail.com	2025-06-19 18:38:38.470289	2025-06-19 18:38:52.393	ding	3	t	f	2025-06-19 18:39:02.194	1	\N	[]	$2b$12$ftKR84p.GFio/350ZKou1eWkyQclqHsHEa2Z4.l.sF7C0OIVqJ9ca	t	\N	\N	\N	\N	credentials
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.schema_migrations (version, inserted_at) FROM stdin;
\.


--
-- Data for Name: subscription; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.subscription (id, subscription_id, entity, filters, claims, created_at) FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.migrations (id, name, hash, executed_at) FROM stdin;
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads (id, in_progress_size, upload_signature, bucket_id, key, version, owner_id, created_at, user_metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads_parts (id, upload_id, size, part_number, bucket_id, key, etag, owner_id, version, created_at) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: supabase_migrations; Owner: -
--

COPY supabase_migrations.schema_migrations (version, statements, name) FROM stdin;
\.


--
-- Data for Name: seed_files; Type: TABLE DATA; Schema: supabase_migrations; Owner: -
--

COPY supabase_migrations.seed_files (path, hash) FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: -
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 1, false);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 1, false);


--
-- Name: subscription_id_seq; Type: SEQUENCE SET; Schema: realtime; Owner: -
--

SELECT pg_catalog.setval('realtime.subscription_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

