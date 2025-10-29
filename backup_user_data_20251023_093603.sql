--
-- PostgreSQL database dump
--

\restrict WxiFI5a4ZCxh2FEFTUfyYuPlqJntbJps4fnpqiFiLeLUIL4kqAwKgRgUpiH2DSh

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

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
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
00000000-0000-0000-0000-000000000000	3ae12d0d-e446-470b-9683-0546a85bed93	authenticated	authenticated	james@mecacaraudio.com	$2a$10$h0/RkZtGl2pITL0Bd2RCl.quIYCd.ylTS0Umnxm5afGPy7JgYmeH.	2025-10-23 13:20:47.195996+00	\N		\N		\N			\N	2025-10-23 13:33:18.29612+00	{"provider": "email", "providers": ["email"]}	{"full_name": "James Ryan", "email_verified": true}	\N	2025-10-23 13:20:47.188682+00	2025-10-23 13:33:18.297025+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.profiles (id, email, full_name, phone, role, membership_status, membership_expiry, avatar_url, bio, created_at, updated_at, billing_street, billing_city, billing_state, billing_zip, billing_country, shipping_street, shipping_city, shipping_state, shipping_zip, shipping_country, use_billing_for_shipping, first_name, last_name, meca_id, profile_picture_url, membership_expires_at) FROM stdin;
3ae12d0d-e446-470b-9683-0546a85bed93	james@mecacaraudio.com	James Ryan		admin	active	\N	\N	\N	2025-10-23 13:20:47.213817+00	2025-10-23 13:31:52.3287+00	202 E. Maurice Linton Rd.	Perry	Florida	32347	USA	202 E. Maurice Linton Rd.	Perry	Florida	32347	USA	f	James	Ryan	202401	\N	\N
\.


--
-- PostgreSQL database dump complete
--

\unrestrict WxiFI5a4ZCxh2FEFTUfyYuPlqJntbJps4fnpqiFiLeLUIL4kqAwKgRgUpiH2DSh

