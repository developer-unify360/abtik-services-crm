# CRM Lead-to-Booking Roadmap

## Objective

Build the best CRM for this exact operating motion:

`Lead Source -> Lead Inbox -> Assignment -> BDE outreach -> Qualification -> Booking Form -> Client + Booking -> IT delivery queue -> IT execution -> QA / client approval -> Closure`

This roadmap is intentionally not trying to become a generic "everything CRM". The winning version of this product should be the fastest, cleanest, and most accountable system for converting inbound leads into booked clients with excellent follow-up discipline.

---

## Executive Summary

The codebase already contains a meaningful foundation:

- Public lead capture exists.
- Leads, lead activities, clients, bookings, banks, attributes, services, and service requests exist.
- Booking creation can create/update the client and optionally create a service request in one flow.
- Audit logs exist for several modules.

However, the product is not yet a strong CRM in practice because the most important operational layers are still missing or only half-implemented:

- no true lead assignment engine
- no BDE work queue
- no lead detail workspace
- no structured calling workflow
- no follow-up task / cadence system for sales
- no reliable scoring engine
- no duplicate prevention workflow for leads
- no funnel analytics deep enough for sales management
- no role model aligned to BDE manager / BDE / ops / finance
- no full IT delivery workspace after booking handoff
- no SLA, checklist, blocker, QA, or workload system for IT members

There is also product drift in the repo:

- frontend modules exist for users, tenants, tasks, kanban, and advanced service operations that are not properly connected
- frontend currently fails `npm run build`
- backend tests still depend on removed tenant/role models and fail during collection

The first priority is not adding flashy features. It is stabilizing the product surface, removing dead/legacy assumptions, and then building the core sales operating system on top of the existing lead and booking foundation.

---

## Codebase Snapshot

### Tech Stack

- Frontend: React 19 + TypeScript + Vite + Zustand + Axios + MUI/Tailwind mix
- Backend: Django 5 + Django REST Framework + JWT auth
- Persistence: PostgreSQL in settings, SQLite file present locally

### Main Implemented Domains

- `leads`
- `clients`
- `bookings`
- `attributes`
- `services`
- `users`
- `audit`

### Current Route Surface

Public:

- `/login`
- `/leads/new`
- `/bookings/new`

Authenticated UI:

- `/dashboard`
- `/leads`
- `/clients`
- `/bookings`
- `/attributes`

### Important Current Models

- `Lead`
- `LeadActivity`
- `Client`
- `Booking`
- `Bank`
- `Service`
- `ServiceRequest`
- `Industry`
- `LeadSource`
- `PaymentType`
- `User`
- `AuditLog`

---

## Current Workflow Coverage

| Workflow Step | Current State | Notes |
|---|---|---|
| Lead capture from website/reference | Implemented | Public lead form and external lead endpoint exist. |
| Lead list / admin view | Implemented | Lead list page exists with summary cards and conversion CTA. |
| BDE assignment | Partial | Lead has `assigned_to`, but there is no assignment workflow, queue, or routing engine. |
| BDE call logging | Partial | Lead activities API exists, but there is no usable sales workspace for call logging. |
| Interested / qualified decision | Partial | Status field exists, but the UI and business rules are weak. |
| Booking form | Implemented | Strongest current module. Handles client + booking + optional service request. |
| Client + booking creation | Implemented | Booking flow can create/update client and mark lead as won. |
| Post-booking service handoff | Partial | Service request backend exists; advanced UI is incomplete / disconnected. |
| IT assignment and execution | Partial | Minimal service request assignment/status exists, but no full delivery queue, checklist, or collaboration layer. |
| QA / service closure | Missing | No structured QA, UAT, client approval, or reopen flow for delivered work. |
| Sales reporting | Partial | Basic counts exist, but not operational CRM analytics. |
| IT delivery reporting | Partial | There is no reliable assignee workload, SLA, throughput, or blocker reporting. |

---

## What Is Already Developed

### 1. Lead Capture Foundation

Implemented well enough to build on:

- public lead form for new leads
- external lead creation endpoint for website submissions
- lead fields for source, service, notes, assigned rep, priority, score, follow-up date
- lead summary endpoint for high-level metrics

### 2. Core Lead Data Model

The `Lead` model already supports:

- lifecycle status
- priority
- lead score
- assigned user
- source
- interested service
- notes
- last contacted timestamp
- next follow-up date

This is a solid base, but the behavior around the model is still light.

### 3. Activity Logging Model

`LeadActivity` already supports:

- call
- email
- meeting
- note
- status change

This is exactly the right kind of object for a CRM timeline. The missing piece is the BDE-facing workflow around it.

### 4. Booking Conversion Flow

The booking flow is ahead of the rest of the CRM:

- booking form can create a booking with payment details
- client details and booking details are submitted together
- optional service request can be created during booking
- existing leads can be linked and marked `closed_won`
- existing clients can be reused based on email/mobile match

### 5. Master Data Management

Admin can already manage:

- industries
- lead sources
- payment types
- banks
- services

This is useful because CRM automation depends heavily on clean master data.

### 6. Audit Logging

Audit logs exist for:

- clients
- bookings
- services
- service requests

This is a good governance base and should be expanded, not replaced.

### 7. Service Handoff Base

There is a post-booking operational concept already present:

- `ServiceRequest`
- assignment
- status transitions
- optional service request creation after booking

This matters because the best CRM for your business should not stop at `closed won`; it should hand off cleanly to delivery.

### 8. Initial IT Delivery Surface

There is already a first-pass IT execution concept in the codebase:

- service request list UI exists
- service request assignment UI exists
- service request status update UI exists
- service dashboard and task queue UI files exist

This is useful because it shows the product already wants to support a booking-to-IT workflow. The gap is that these pieces are not yet reliable, complete, or fully connected to the real product surface.

---

## What Is Partially Developed or Disconnected

### 1. Lead Assignment Exists in Data, Not in Product

Current state:

- `Lead.assigned_to` exists
- public form can pre-assign
- filters support assignment

Missing:

- bulk assign
- auto-assign by rule
- round robin
- load balancing
- reassignment audit
- manager visibility into unassigned leads

### 2. Lead Activities Exist in API, Not in Daily Workflow

Current state:

- backend can log activity
- lead status change creates activity

Missing:

- lead detail drawer/page
- call outcome modal
- next step capture after each call
- BDE task queue
- SLA / overdue logic

### 3. Lead Conversion Is Operationally Thin

Current state:

- convert button routes user into booking flow
- lead becomes `closed_won` when booking is created

Missing:

- qualification checklist before booking
- explicit "interested", "not interested", "follow-up", "booked", "lost reason" states
- conversion audit with reason and responsible user
- prevention of duplicate booking conversion

### 4. Service Modules Are Ahead of Routing

There are service management and task-related frontend files, but they are not part of the main application route map. Some of those files still assume old concepts like categories, tasks, roles, and tenants that no longer match the live backend.

### 5. IT Delivery Exists as a Minimal Request Model, Not a Real Fulfillment System

Current state:

- `ServiceRequest` has `booking`, `service`, `assigned_to`, `status`, `priority`, and `completed_at`
- assignment and status APIs exist
- hidden frontend pages suggest queue, dashboard, and task behavior

Missing:

- handoff checklist from BDE to IT
- request detail workspace
- internal notes vs client-visible notes
- subtasks/checklists
- due dates and SLA targets
- blockers and waiting states beyond one generic `waiting_client`
- QA review and approval flow
- workload balancing and capacity planning
- delivery analytics

### 6. User Management Is Inconsistent

Frontend expects:

- roles
- role names
- `/roles/`

Backend currently supports:

- simple users only
- admin-only user management
- no proper sales role model

### 7. Multi-Tenant / Role Legacy Is Still Present in Tests and Dead Files

There are old references to:

- tenants
- roles
- permissions
- task board creation from service requests

These concepts are not active in the current installed-app model, but legacy files still reference them.

---

## Immediate Technical Risks

These are not roadmap items for later. These are current blockers.

### Product Integrity Risks

- Frontend does not currently compile cleanly.
- Backend test suite is stale and broken.
- Several frontend modules point to endpoints that do not exist.

### Domain Logic Risks

- Lead search fields use old names like `first_name`, `last_name`, and `phone`, while the actual model uses `client_name` and `mobile`.
- Client industry filtering uses a string filter on a foreign key.
- `LeadService.ensure_lead_exists()` and `BookingService.create_booking()` use `'other'` as a fallback for foreign key fields, which is unsafe and should be replaced with `null` or a real default record.

### Security / Access Risks

- `ActivityViewSet` currently allows public access. Lead activities should never be public.
- Route protection only checks token presence, not role-based authorization.
- Sensitive sales/payment surfaces need stronger permissions by module and action.

### Product Drift Risks

- Hidden or dead modules create confusion for future development.
- Old concepts in tests create false confidence and slow feature work.

---

## Benchmark Patterns From Strong CRM Products

The roadmap below is based on recurring patterns found in strong CRM products that match your flow:

- HubSpot: rich forms, lead scoring, calling, workflows, round-robin meetings
- Zoho CRM: assignment rules, webforms, cadences, workflow/approval layers
- Freshsales: built-in phone, auto-assignment, activity timeline, scoring, deduplication
- Pipedrive: activity-driven lead follow-up, scheduler, call insights, lightweight automation
- Salesforce: web-to-lead, scoring, AI-assisted qualification, conversation intelligence
- Jira Service Management: delivery queues, SLA-driven triage, approvals, knowledge-backed execution
- Freshservice: service catalog, workflow automation, SLA management, project-style delivery visibility
- Zoho Desk: direct / round-robin / skill-based assignment, blueprints, SLA escalation
- ServiceNow: request management, catalog workflows, service-level management, unified fulfillment context

The shared pattern is clear:

1. Capture leads cleanly.
2. Route them instantly.
3. Make every outreach attempt visible.
4. Force a next step after each interaction.
5. Surface the hottest / stalled / overdue leads immediately.
6. Make conversion to booking a controlled, auditable action.
7. Give managers operational visibility, not just totals.
8. Turn each booking into a structured delivery request, not a chat handoff.
9. Let IT teams work from queues, due dates, blockers, and approvals.
10. Keep delivery evidence, client dependencies, and completion quality inside the system.

---

## Product Positioning Recommendation

Do not try to beat Salesforce by breadth.

Instead, become:

**The best lead-to-booking-to-delivery CRM for BDE-driven service sales.**

That means the product should become exceptional at:

- inbound lead capture
- assignment fairness and speed
- call-first sales workflows
- structured qualification
- rapid booking conversion
- payment and booking visibility
- clean post-booking handoff
- accountable IT execution after handoff
- service completion quality and turnaround visibility
- manager accountability dashboards

---

## Priority Framework

### P0: Stabilize the foundation

Make the current product reliable, coherent, and safe.

### P1: Build the sales operating system

Give BDEs and managers the tools they actually need every day.

### P1B: Build the IT delivery operating system

Give IT Admins and IT members a structured way to accept, assign, execute, and close booked services.

### P2: Add automation and optimization

Reduce manual work, increase speed-to-contact, and improve both conversion and delivery quality.

### P3: Add differentiators

Make the product smarter than most mid-market CRMs for this exact motion.

---

## P0 - Foundation Stabilization

### Goal

Remove product drift and make the current CRM trustworthy before adding new complexity.

### BDE Access Model

BDEs are non-technical field agents. They do NOT have system logins. They interact with the CRM exclusively through public forms:

- `/leads/new` — BDE submits a new lead after cold outreach
- `/bookings/new` — BDE submits a booking after conversion

System users (those who log in) are: Admins, Sales Managers, Booking Ops, Finance, Service Ops. The `bde_name` field on Lead/Booking is a free-text CharField, not a foreign key to User. The "Assign To" dropdown on the public lead form assigns the lead to a Sales Manager (system user).

### Why This Is First

If the codebase keeps two incompatible product directions alive at once, every future feature will cost more and break more often.

### Deliverables

#### 1. Clean the Build and Test Surface

Do first:

- fix all TypeScript build errors
- remove or complete broken imports
- align frontend DTOs with backend serializers
- make backend tests run with current domain models
- delete or archive obsolete tenant/role/task tests if those features are not returning

Definition of done:

- `frontend` builds cleanly
- backend test command is documented and passes for active modules
- no route points to nonexistent APIs

#### 2. Declare the Real Product Surface

Choose one of these paths for each disconnected module:

- finish and expose it
- move it behind a feature flag
- archive it

Candidates:

- tenants
- roles
- task kanban
- legacy category assumptions
- create-task-from-service-request assumptions

Definition of done:

- every visible page is supported by working backend APIs
- every unsupported module is clearly removed from active scope

#### 3. Introduce a Real Role Model (System Users Only)

Recommended system roles (BDE is NOT a system role — they use public forms):

- `Admin` — Full system access
- `Sales Manager` — Manages leads, assignments, views reports
- `Booking Ops` — Manages bookings, clients, payment data
- `Finance` — Views payment/financial data
- `Service Ops` — Manages service requests and IT delivery

Recommended permissions:

- lead view own / team / all
- assign leads
- convert lead to booking
- edit payment details
- approve discounts / exceptions
- manage master data
- manage reports

Development notes:

- do not reintroduce the old tenant/role system blindly
- implement as a simple CharField on User with choices, not a separate Role/Permission table
- use explicit permission checks in DRF and hide frontend actions by permission
- BDE interactions happen through public forms, not through authenticated APIs

#### 4. Fix Data and Security Gaps

Must-fix items:

- lock down lead activities
- fix wrong lead search fields
- fix invalid fallback foreign key defaults
- add unique/dedupe strategy for leads
- add proper serializer validation for lead conversion and booking conversion

#### 5. Add Environment and Operational Hygiene

- move API base URL to environment config
- standardize response envelopes
- standardize pagination
- add error codes for important business errors
- add seed data for lead statuses, sources, payment types, and demo workflows

### P0 Data Changes

Add or standardize:

- `lead_status_reason`
- `lost_reason`
- `interested_at`
- `converted_at`
- `converted_booking_id`
- `assignment_method`
- `assigned_at`
- `first_response_at`
- `last_activity_at`

### P0 Acceptance Criteria

- system compiles and tests cleanly
- no public write access to lead internals
- role model exists and is enforced
- dead modules are either removed or intentionally scoped

---

## P1 - Core CRM Workflow Excellence

### Goal

Turn the system from "records exist" into "sales team can run their day here".

### Epic 1. Lead Inbox and Lead Workspace

#### Product outcome

A BDE should be able to open one lead and do everything needed without leaving the workspace.

#### Frontend features

- `Lead Inbox` page with tabs:
  - New
  - Unassigned
  - My Leads
  - Follow-up Due
  - Interested
  - Lost
- list + board toggle
- lead detail drawer or full page
- timeline of activities
- quick actions:
  - call logged
  - no answer
  - follow-up scheduled
  - interested
  - not interested
  - convert to booking

#### Backend features

- lead query endpoints optimized for:
  - owner
  - queue
  - overdue
  - source
  - service
  - aging
- activity feed endpoint with pagination
- summary counters by queue, owner, source, and aging bucket

#### Data model additions

- `LeadDisposition` enum or model:
  - not_connected
  - wrong_number
  - callback_requested
  - interested
  - not_interested
  - budget_issue
  - competitor
  - duplicate
  - spam
- `LeadAttempt` or a richer `LeadActivity` payload:
  - call outcome
  - duration
  - notes
  - next follow-up at

#### Acceptance criteria

- BDE can complete full lead follow-up from one workspace
- manager can see queue aging and rep workload
- every lead has visible ownership and next step

### Epic 2. Lead Assignment Engine

#### Product outcome

New leads should not sit unassigned or be manually distributed from spreadsheets or chat.

#### Required capability

- manual assign
- bulk assign
- auto-assign by rule
- round robin
- load-balanced assign
- fallback owner or queue
- reassignment history

#### Rule inputs

- lead source
- service
- industry
- geography
- language
- business hours
- rep capacity
- rep availability

#### Suggested model

`LeadAssignmentRule`

- `name`
- `is_active`
- `priority_order`
- `conditions_json`
- `assignment_strategy`
- `eligible_users`
- `fallback_user`
- `business_hours`

#### Suggested APIs

- `POST /lead-assignment-rules/`
- `PATCH /lead-assignment-rules/{id}/`
- `POST /leads/{id}/assign/`
- `POST /leads/bulk-assign/`
- `POST /leads/auto-assign/`

#### Acceptance criteria

- all new leads are assigned within seconds or clearly marked in unassigned queue
- managers can rebalance ownership in bulk
- assignment history is audit logged

### Epic 3. BDE Calling Workflow

#### Product outcome

Calling should feel like a guided workflow, not a notes field.

#### Must-have features

- click `Log Call`
- select outcome
- enter call notes
- capture duration
- capture next action
- enforce next follow-up date for specific outcomes
- update lead status automatically from outcome

#### Recommended call outcomes

- connected
- no answer
- busy
- switched off
- invalid number
- callback later
- interested
- not interested
- meeting requested

#### CRM benchmark pattern

Top CRMs do not treat calling as free-text only. They make call outcomes structured so reporting and automation become possible.

#### Optional P1.5

- third-party telephony integration
- call recording link
- recording consent handling

### Epic 4. Qualification and Conversion

#### Product outcome

The path from "interested" to "booking created" should be explicit, auditable, and fast.

#### Required changes

Replace the current status set with a flow aligned to your business:

- `new`
- `assigned`
- `attempted`
- `connected`
- `follow_up_due`
- `interested`
- `qualified`
- `booking_in_progress`
- `booked`
- `lost`
- `spam`

#### Qualification fields

- service interested in
- expected package/value
- urgency
- decision maker confirmed
- budget confidence
- required documents available
- preferred callback time

#### Booking conversion flow

When converting:

- show lead summary in booking form header
- prefill all relevant fields
- lock and record source attribution
- create client if needed
- create booking
- link lead to booking
- close lead as `booked`
- create service request if configured

#### Acceptance criteria

- no lead can be "booked" without linked booking record
- no duplicate booking is created from accidental double conversion
- conversion metrics are visible by source, rep, and service

### Epic 5. Sales Follow-Up Tasks

#### Product outcome

No lead should disappear because someone forgot the next action.

#### Required features

- every lead has `next_action_type` and `next_action_at`
- overdue queue
- today queue
- snooze
- manager escalation for stale leads
- auto-create follow-up task from call outcome

#### Suggested task types

- call
- whatsapp
- email
- collect documents
- send proposal
- booking follow-up

#### Important note

The existing generic kanban/task code should not be used blindly for this. Sales follow-up tasks should first be implemented as lightweight CRM-native tasks tied directly to leads.

### P1 Metrics

Track from day one:

- lead response time
- assignment time
- first contact time
- calls per lead
- connection rate
- interested rate
- qualification rate
- booking conversion rate
- lost reason distribution
- overdue follow-up count

---

## P1B - IT Delivery Operations Excellence

### Goal

Turn every confirmed booking into a structured, trackable service execution workflow for the IT team.

### Why This Is P1B

Once revenue is booked, trust shifts from the BDE team to the IT delivery team. If that handoff happens in WhatsApp, calls, spreadsheets, or memory, the CRM stops being useful at the exact moment the client expects execution.

### Epic 1. Booking-to-IT Handoff

#### Product outcome

The moment a booking is ready for fulfillment, IT should receive a complete, prioritized, and auditable handoff.

#### Required features

- auto-create one or more service requests from the booking
- allow a booking to split into multiple delivery requests when a bundle has multiple services
- handoff note from BDE to IT
- handoff completeness check
- required handoff fields:
  - service scope
  - promised timeline
  - client primary contact
  - documents received
  - dependencies / blockers known at handoff
  - payment visibility summary
- handoff accepted / rejected state for IT Admin

#### Acceptance criteria

- no booking enters fulfillment without a linked service request
- IT Admin can instantly see which handoffs are incomplete
- BDE and IT can both trace what was promised and what was handed over

### Epic 2. IT Delivery Queue and Request Workspace

#### Product outcome

Each IT Admin / IT Member should work from a proper queue and a detailed request page, not from a generic list.

#### Required queue views

- New Handoffs
- Unassigned
- My Work
- Due Today
- Overdue
- Waiting for Client
- Blocked
- QA Review
- Completed Today

#### Required request workspace sections

- booking summary
- client details
- service requested
- handoff notes
- internal activity timeline
- internal notes vs client-visible updates
- attachments and deliverables
- checklist / subtasks
- blockers
- due dates
- assignees and collaborators

#### Acceptance criteria

- any IT member can open one request and understand exactly what to do next
- managers can see request health without opening each record individually

### Epic 3. IT Assignment, Ownership, and Workload

#### Product outcome

IT Admin should be able to distribute work by skill, capacity, and urgency rather than manually forwarding work.

#### Required features

- assign primary owner
- assign secondary collaborators
- assign by team or skill group
- bulk assignment and reassignment
- workload view by member
- capacity guardrails
- escalation for overdue unassigned requests

#### Recommended roles

- `IT Admin`
- `IT Member`
- `QA Reviewer`
- `Service Ops`

#### Suggested assignment strategies

- direct assignment
- round robin
- skill-based assignment
- least-loaded assignment
- fallback to IT Admin queue

### Epic 4. Execution Checklists, Subtasks, and Evidence

#### Product outcome

Service delivery should be driven by repeatable checklists and visible proof-of-work.

#### Required features

- service template per service type
- checklist items generated from service template
- manual subtasks
- dependency tracking between checklist items
- required document checklist
- deliverable upload
- completion evidence / proof-of-work
- reopen specific checklist items without reopening the whole service blindly

#### Good fit for your business

This is especially important if services involve domains, hosting, development, filing, deployment, SEO setup, integrations, onboarding, or any work with multiple handoff steps.

### Epic 5. Waiting States, Blockers, and Client Dependency Management

#### Product outcome

The system should clearly separate "IT is not working" from "IT is waiting on someone else".

#### Required states

- waiting_client
- waiting_vendor
- blocked_internal
- qa_review

#### Required features

- blocker reason
- waiting-on person/team
- waiting-since timestamp
- automatic reminders
- client dependency checklist
- resume workflow when dependency is cleared
- manager visibility into blocked aging

#### Acceptance criteria

- blocked work is visible at the queue level
- client-caused delays do not make IT performance appear worse than it is

### Epic 6. QA, UAT, and Closure

#### Product outcome

A request should not jump from `in_progress` to `closed` without a quality step.

#### Required features

- QA required flag by service type
- QA checklist
- reviewer assignment
- client UAT / approval state where relevant
- reopen with reason
- final completion summary
- closure reason
- client satisfaction / CSAT capture

#### Recommended delivery statuses

- `new_handoff`
- `intake_review`
- `ready_for_assignment`
- `assigned`
- `in_progress`
- `waiting_client`
- `waiting_vendor`
- `blocked`
- `qa_review`
- `completed`
- `approved`
- `closed`
- `cancelled`

### Epic 7. IT Manager Dashboard

#### Replace the current lightweight service dashboard with:

- new handoffs today
- unassigned requests
- overdue requests
- SLA-risk requests
- requests by assignee
- requests by service
- blocked requests by reason
- average handoff-to-assignment time
- average assignment-to-start time
- average completion time
- reopen rate
- first-time-right completion rate
- utilization / workload distribution

#### Drill-downs

- click any dashboard card to open a filtered queue
- compare IT Admin and IT Member throughput
- identify services that consistently get blocked or reopened

### Epic 8. Client Communication During Delivery

#### Product outcome

The IT team should keep client-facing updates inside the system, not scattered across personal chats.

#### Required features

- internal note vs client-visible update
- document request to client
- due-date reminders to client
- client-visible progress summary
- delivery completion message template

### P1B Metrics

Track from day one:

- booking-to-handoff time
- handoff completeness rate
- handoff rejection rate
- time to IT assignment
- time to first work start
- on-time completion rate
- average blocked days
- waiting-client aging
- throughput per IT member
- reopen rate
- QA fail rate
- CSAT after delivery

---

## P2 - Automation, Intelligence, and Manager Control

### Goal

Reduce manual work and improve sales and delivery quality using rules, scoring, templates, and guided automation.

### Epic 1. Lead Scoring Engine

#### Why

The model already has `lead_score`, but there is no scoring logic. A score without an engine becomes misleading.

#### Recommended scoring model

Split score into:

- `fit_score`
- `engagement_score`
- `total_score`

#### Example fit criteria

- source quality
- service match
- industry match
- geography
- company size
- decision-maker flag

#### Example engagement criteria

- answered call
- multiple call attempts
- callback requested
- responded on WhatsApp/email
- opened proposal
- submitted booking docs

#### Required features

- score rules admin UI
- positive and negative points
- score decay
- threshold badges:
  - Hot
  - Warm
  - Cold

#### Reporting

- bookings by score band
- rep performance by hot-lead conversion
- source quality by score

### Epic 2. Sales Cadences / Sequences

#### Why

Strong CRM products automate follow-up sequences across calls, tasks, and messages. Your team currently has manual follow-up risk.

#### Required cadence features

- trigger on new assigned lead
- trigger on no response
- trigger on interested but not booked
- stop cadence on booking or loss
- step types:
  - create call task
  - send template email
  - send WhatsApp prompt
  - manager reminder

#### Suggested cadences

- New inbound lead 3-day sequence
- No answer retry sequence
- Interested but document pending sequence
- Interested but no booking sequence

### Epic 3. Duplicate Detection and Merge

#### Why

Top CRM products aggressively prevent duplicate leads and clients. Your current system only partially deduplicates during client creation.

#### Required matching logic

- exact email
- exact mobile
- fuzzy company + mobile
- fuzzy company + client name

#### Features

- duplicate warning during lead create
- duplicate queue for managers
- merge screen
- winner record selection
- merged activity history retention

### Epic 4. Sales Manager Dashboard

#### Replace current basic dashboard with:

- new leads today
- unassigned leads
- first response SLA breaches
- overdue follow-ups
- bookings today
- bookings by source
- bookings by BDE
- lead aging buckets
- top lost reasons
- source-to-booking funnel
- service-wise booking funnel

#### Drill-downs

- click any metric to open the filtered list
- manager can inspect rep performance without exporting to Excel

### Epic 5. Source Attribution and Form Analytics

#### Why

The current system stores lead source, but not enough acquisition context.

#### Add

- `source_channel`
- `source_campaign`
- `source_medium`
- `landing_page`
- `referrer`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `form_id`
- `form_variant`

#### Reports

- source -> interested
- source -> booked
- cost per booking
- campaign quality by rep conversion speed

### Epic 6. Booking Governance

#### Why

Your booking form is powerful, but it needs stronger CRM rules around it.

#### Add

- booking approval rules for discounts or exceptions
- required document checklist
- booking stage audit trail
- quote / proposal PDF
- payment milestone tracking
- booking exception alerts

### Epic 7. Service Delivery Templates and Blueprints

#### Why

Top service-delivery platforms reduce chaos by turning common request types into templates, checklists, approvals, and automations.

#### Required features

- service templates by service type
- default checklist generation
- default SLA policy by service + priority
- default QA requirement
- default assignee group
- stage blueprint with allowed transitions

#### Examples

- website setup template
- GST / filing template
- SEO onboarding template
- software deployment template
- integration setup template

### Epic 8. SLA, Due Dates, and Escalation

#### Why

The IT team needs delivery commitments that are measurable, not just "high priority" labels.

#### Required features

- target response SLA
- target start SLA
- target completion SLA
- warning thresholds
- breach alerts
- escalation rules to IT Admin / manager
- service-specific SLA policies

#### Reports

- SLA compliance by assignee
- SLA compliance by service type
- breach reasons
- breached work value / volume

### Epic 9. Delivery Analytics and Workforce Planning

#### Required features

- backlog trend
- throughput by week
- assignee utilization
- WIP limit alerts
- service-wise average completion time
- reopen trend
- blocked trend
- revenue vs delivery load view

### Epic 10. Knowledge Base and SOP Layer

#### Why

As the IT team grows, repeatable execution should move from tribal knowledge to structured SOPs.

#### Required features

- SOP per service type
- checklist-linked knowledge articles
- internal troubleshooting notes
- reusable client communication templates
- searchable delivery playbooks

### Epic 11. Client Portal for Post-Booking Delivery

#### Required features

- client can see delivery status
- client can upload missing documents
- client can respond to dependency requests
- client can view deliverables
- client can approve / reject completed work
- client can submit post-delivery rating

---

## P3 - Differentiators That Can Make This Product Best-in-Class

### Goal

After the core sales system is strong, add features that create a real competitive edge for your workflow.

### 1. AI Sales Assistant

Use AI only after the structured CRM foundation exists.

Useful AI features:

- call note summarization
- suggested follow-up text
- suggested lost reason from notes
- lead priority recommendations
- risk prediction for stale interested leads
- manager coaching highlights by rep

Do not start here. AI on weak process data produces noise.

### 2. Conversation Intelligence

- call transcript storage
- objection detection
- competitor mention detection
- pricing concern detection
- keyword tagging
- QA review for managers

### 3. Omnichannel Sales Inbox

- phone
- email
- WhatsApp
- website chat

All should write into the same lead timeline.

### 4. Smart Booking Recommendations

- suggest package/service bundle based on source + past bookings
- suggest next best action based on lead stage
- suggest best rep based on service/source win rate

### 5. Forecasting and Capacity Planning

- rep-wise forecast
- source forecast
- service demand forecast
- booking ops workload forecast

### 6. Mobile-First BDE Experience

Your actual BDE team may be heavily mobile. A strong mobile workflow can become a major competitive advantage.

Minimum mobile features:

- call logging in under 20 seconds
- voice note to text
- follow-up reminders
- lead queue
- booking conversion initiation

### 7. AI Delivery Assistant

Useful IT-side AI features:

- summarize handoff notes into an execution brief
- suggest checklist items based on service type
- summarize client dependency blockers
- draft client-facing progress updates
- detect requests at risk of SLA breach
- suggest knowledge articles / SOPs for current request context

### 8. Delivery Intelligence

- completion-risk scoring for active service requests
- blocker pattern detection by service type
- assignee workload anomaly detection
- reopen prediction
- service template optimization suggestions

---

## Recommended Product Architecture Direction

### Separate the Product Into Three Clear Layers

#### Layer 1. Sales CRM

Scope:

- leads
- assignments
- activities
- follow-ups
- qualification
- conversion
- sales dashboards

#### Layer 2. Booking Operations

Scope:

- booking form
- payment tracking
- document collection
- booking approval
- booking status

#### Layer 3. Delivery / Service Handoff

Scope:

- service request creation
- assignment
- IT queue management
- execution checklists
- internal/client updates
- blockers and waiting states
- QA and closure
- delivery analytics

This separation keeps the product easy to reason about and prevents unrelated ERP complexity from polluting the core sales flow.

---

## Suggested Data Model Additions

### Lead

Add:

- `lead_number`
- `status_reason`
- `lost_reason`
- `fit_score`
- `engagement_score`
- `total_score`
- `assignment_method`
- `assigned_at`
- `first_response_at`
- `first_connected_at`
- `interested_at`
- `qualified_at`
- `converted_at`
- `converted_booking`
- `last_call_outcome`
- `next_action_type`
- `next_action_at`
- `source_campaign`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `landing_page`

### LeadActivity

Add or normalize:

- `channel`
- `outcome`
- `duration_seconds`
- `direction`
- `recording_url`
- `next_action_type`
- `next_action_at`
- `metadata_json`

### FollowUpTask

Create:

- `lead`
- `task_type`
- `due_at`
- `status`
- `assigned_to`
- `created_by`
- `completed_at`
- `auto_created`
- `cadence_step`

### LeadAssignmentRule

Create:

- `name`
- `priority`
- `is_active`
- `conditions_json`
- `strategy`
- `eligible_users`
- `fallback_user`
- `last_distributed_to`

### LeadScoreRule

Create:

- `name`
- `score_type`
- `is_active`
- `criteria_json`
- `decay_enabled`
- `decay_window_days`

### Cadence

Create:

- `name`
- `trigger_event`
- `stop_conditions`
- `is_active`

### CadenceStep

Create:

- `cadence`
- `sequence_order`
- `delay_hours`
- `action_type`
- `template_id`
- `task_type`
- `conditions_json`

### ServiceRequest

Add or normalize:

- `request_number`
- `booking`
- `service`
- `service_template`
- `status`
- `priority`
- `assigned_group`
- `primary_owner`
- `due_at`
- `target_response_at`
- `target_start_at`
- `target_complete_at`
- `started_at`
- `waiting_since`
- `blocked_reason`
- `qa_required`
- `qa_status`
- `approved_at`
- `closed_at`
- `completed_by`
- `closed_by`
- `reopened_count`

### ServiceAssignment

Create:

- `service_request`
- `user`
- `assignment_role`
- `assigned_at`
- `assigned_by`
- `is_primary`

### ServiceChecklistTemplate

Create:

- `service`
- `name`
- `is_active`
- `default_priority`
- `default_sla_policy`
- `qa_required`

### ServiceChecklistItem

Create:

- `service_request`
- `template_item_id`
- `title`
- `status`
- `position`
- `assigned_to`
- `due_at`
- `completed_at`
- `completion_notes`

### ServiceComment

Create:

- `service_request`
- `author`
- `comment_type`
- `body`
- `is_client_visible`

### ServiceAttachment

Create:

- `service_request`
- `uploaded_by`
- `file`
- `attachment_type`
- `is_client_visible`

### ServiceTimeLog

Create:

- `service_request`
- `user`
- `started_at`
- `ended_at`
- `minutes`
- `notes`

### ServiceSlaPolicy

Create:

- `name`
- `service`
- `priority`
- `response_minutes`
- `start_minutes`
- `completion_minutes`
- `warning_threshold_percentage`

### ServiceQaReview

Create:

- `service_request`
- `reviewer`
- `status`
- `review_notes`
- `reviewed_at`

---

## Recommended API Expansion

### Leads

- `GET /leads/queue/`
- `GET /leads/my-work/`
- `POST /leads/{id}/assign/`
- `POST /leads/bulk-assign/`
- `POST /leads/{id}/log-call/`
- `POST /leads/{id}/mark-interested/`
- `POST /leads/{id}/mark-lost/`
- `POST /leads/{id}/convert-to-booking/`
- `GET /leads/funnel-summary/`
- `GET /leads/aging-summary/`

### Activities

- `GET /lead-activities/`
- `POST /lead-activities/`
- `PATCH /lead-activities/{id}/`

### Follow-ups

- `GET /follow-up-tasks/`
- `POST /follow-up-tasks/`
- `PATCH /follow-up-tasks/{id}/complete/`
- `PATCH /follow-up-tasks/{id}/snooze/`

### Assignment

- `GET /lead-assignment-rules/`
- `POST /lead-assignment-rules/`
- `PATCH /lead-assignment-rules/{id}/`
- `POST /lead-assignment-rules/run/`

### Scoring

- `GET /lead-score-rules/`
- `POST /lead-score-rules/`
- `POST /leads/recalculate-scores/`

### Cadences

- `GET /cadences/`
- `POST /cadences/`
- `POST /cadences/{id}/activate/`
- `POST /lead-cadences/{id}/stop/`

### Booking-to-IT Handoff

- `POST /bookings/{id}/handoff-to-it/`
- `GET /bookings/{id}/handoff-summary/`
- `POST /bookings/{id}/create-service-requests/`

### Service Requests

- `GET /service-requests/queue/`
- `GET /service-requests/my-work/`
- `GET /service-requests/dashboard-summary/`
- `POST /service-requests/{id}/assign/`
- `POST /service-requests/bulk-assign/`
- `PATCH /service-requests/{id}/status/`
- `POST /service-requests/{id}/accept-handoff/`
- `POST /service-requests/{id}/mark-blocked/`
- `POST /service-requests/{id}/mark-waiting-client/`
- `POST /service-requests/{id}/resume/`
- `POST /service-requests/{id}/submit-for-qa/`
- `POST /service-requests/{id}/approve/`
- `POST /service-requests/{id}/reopen/`
- `POST /service-requests/{id}/close/`

### Service Checklists and Notes

- `GET /service-checklist-items/`
- `POST /service-checklist-items/`
- `PATCH /service-checklist-items/{id}/`
- `POST /service-requests/{id}/comments/`
- `POST /service-requests/{id}/attachments/`
- `POST /service-requests/{id}/time-logs/`

### IT Reporting and SLA

- `GET /service-requests/aging-summary/`
- `GET /service-requests/sla-summary/`
- `GET /service-requests/workload-summary/`
- `GET /service-requests/blocker-summary/`

---

## Suggested UI Navigation After P1/P2

- Dashboard
- Lead Inbox
- My Follow-ups
- Bookings
- IT Handoffs
- My IT Queue
- Delivery Reports
- Clients
- Reports
- Service Handoff
- Settings

Settings should contain:

- users
- roles
- lead sources
- payment types
- services
- banks
- assignment rules
- scoring rules
- cadences
- service templates
- SLA policies
- QA templates

---

## Recommended Delivery Order

### Phase 0

- build/test stabilization
- role model
- security fixes
- DTO cleanup
- dead code / dead route cleanup

### Phase 1

- lead workspace
- lead assignment
- structured call logging
- follow-up tasks
- improved qualification states
- booking conversion hardening
- booking-to-IT handoff
- IT queue and request workspace
- IT assignment and checklist workflow
- QA and closure basics

### Phase 2

- manager dashboards
- scoring engine
- duplicate management
- cadences
- source attribution
- service templates / blueprints
- SLA and escalation engine
- IT dashboards and workload planning
- client delivery portal basics

### Phase 3

- telephony integration
- omnichannel timeline
- AI assistant
- conversation intelligence
- forecasting
- AI delivery assistant
- delivery intelligence
- advanced knowledge / SOP system

---

## Success Metrics

The roadmap should be judged by business outcomes, not just shipping velocity.

### Core operational metrics

- median time from lead creation to assignment
- median time from assignment to first call
- first response SLA breach rate
- follow-up overdue rate
- connected call rate
- interested rate
- qualified rate
- booking conversion rate
- source-wise booking conversion
- rep-wise booking conversion

### Quality metrics

- duplicate lead rate
- percentage of leads with next step
- percentage of interested leads without booking after 3/7 days
- lost-reason completeness
- activity logging completeness

### IT delivery metrics

- booking-to-handoff time
- handoff completeness rate
- service request assignment time
- service request start time
- on-time completion rate
- SLA breach rate
- waiting-client aging
- blocked aging
- reopen rate
- first-time-right completion rate
- throughput per IT member
- client approval turnaround
- CSAT after delivery

### Delivery metrics

- frontend build pass rate
- backend test pass rate
- production error rate
- API response time on lead queues
- API response time on IT queues

---

## Final Recommendation

If we want this project to become "the best", the winning move is:

1. Stabilize the current product and remove legacy drift.
2. Build a serious BDE operating system around leads, assignment, calls, and follow-ups.
3. Make booking conversion fast, safe, and deeply measurable.
4. Build a real IT delivery operating system around handoff, assignment, execution, QA, and closure.
5. Add automation and intelligence only after the operational workflow is solid.

The booking module is already the strongest part of the system. The biggest opportunity now is to make everything before booking and everything after booking equally strong, so the product owns the full revenue-to-delivery lifecycle.

---

## External Benchmark References

- HubSpot calling: https://knowledge.hubspot.com/calling/make-calls-in-the-hubspot-browser
- HubSpot lead scoring: https://knowledge.hubspot.com/scoring/build-lead-scores
- HubSpot workflows: https://knowledge.hubspot.com/workflows/create-workflows-from-scratch
- HubSpot meetings / round robin: https://knowledge.hubspot.com/meetings-tool/understand-group-and-round-robin-meeting-availability
- HubSpot forms behavior: https://knowledge.hubspot.com/forms/preview-forms
- HubSpot spam-form handling: https://knowledge.hubspot.com/forms/manage-your-forms
- Zoho assignment rules: https://help.zoho.com/portal/en/kb/crm/automate-business-processes/assignment-rules/articles/set-assignment-rules
- Zoho cadences: https://help.zoho.com/portal/en/kb/crm/faqs/automation/cadences/articles/faqs-cadences
- Zoho webforms: https://help.zoho.com/portal/en/kb/crm/connect-with-customers/webforms/articles/set-up-web-forms
- Freshsales CRM features: https://www.freshworks.com/crm/features/
- Pipedrive lead follow-up: https://www.pipedrive.com/en/products/sales/lead-follow-up-software
- Pipedrive scheduler: https://www.pipedrive.com/en/products/sales/scheduling-tool
- Pipedrive lead CRM: https://www.pipedrive.com/en/products/sales/leads/lead-crm
- Pipedrive lead scoring: https://www.pipedrive.com/en/products/sales/score-crm
- Salesforce lead conversion guide: https://www.salesforce.com/in/resources/articles/improve-lead-conversion/
- Salesforce lead generation guide: https://www.salesforce.com/products/guide/lead-gen/routing-assignment-rules/
- Salesforce sales AI / conversation intelligence: https://www.salesforce.com/sales/ai/
- Jira Service Management: https://www.atlassian.com/software/jira/service-management
- Freshservice IT service management: https://www.freshworks.com/freshservice/it-service-management/
- Zoho Desk ticketing / assignment / automation overview: https://www.zoho.com/desk/
- ServiceNow IT service management overview: https://www.servicenow.com/products/it-service-management.html
