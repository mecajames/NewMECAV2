// AUTO-GENERATED 2026-06-26 from the local dev ticket configuration. This is the
// CANONICAL TARGET for syncing the production ticket setup (departments,
// categories, routing) to match local. Natural keys used for idempotent upsert:
//   department.slug | category.key | routingRule.name
// Routing staff assignments are intentionally dropped (staff profiles differ
// per environment); department assignments resolve by slug.

export interface SeedDepartment { name: string; slug: string; description: string | null; isActive: boolean; isPrivate: boolean; isDefault: boolean; displayOrder: number; audience: string; requiredRoles: string[] | null; }
export interface SeedCategory { key: string; label: string; departmentSlug: string | null; description: string | null; displayOrder: number; isActive: boolean; audience: string; requiredRoles: string[] | null; }
export interface SeedRoutingRule { name: string; description: string | null; isActive: boolean; priority: number; conditions: Record<string, any>; assignToDepartmentSlug: string | null; setPriority: string | null; }

/** Old/retired department slug -> the active department its tickets should move to. */
export const TICKET_DEPARTMENT_REMAP: Record<string, string> = {
  "general_support": "triage",
  "membership_services": "membership_account",
  "technical_support": "website_technical",
  "billing": "billing_payments",
  "administration": "triage",
  "event_disputes": "event_operations",
  "score_points": "triage",
  "meca_rules": "triage"
};

export const TARGET_DEPARTMENTS: SeedDepartment[] = [
  {
    "name": "General Support",
    "slug": "general_support",
    "description": "General inquiries and support requests",
    "isActive": false,
    "isPrivate": false,
    "isDefault": false,
    "displayOrder": 1,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "name": "Membership & Account",
    "slug": "membership_account",
    "description": "Renewals, account/login, MECA ID card, team membership.",
    "isActive": true,
    "isPrivate": false,
    "isDefault": false,
    "displayOrder": 1,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "name": "Billing & Payments",
    "slug": "billing_payments",
    "description": "Payments, invoices, subscriptions, refunds.",
    "isActive": true,
    "isPrivate": false,
    "isDefault": false,
    "displayOrder": 2,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "name": "Membership Services",
    "slug": "membership_services",
    "description": "Membership questions, renewals, and account issues",
    "isActive": false,
    "isPrivate": false,
    "isDefault": false,
    "displayOrder": 2,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "name": "Shop & Shipping",
    "slug": "shop_shipping",
    "description": "Shop orders, shipping/delivery, returns.",
    "isActive": true,
    "isPrivate": false,
    "isDefault": false,
    "displayOrder": 3,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "name": "Event Operations",
    "slug": "event_operations",
    "description": "Event registration, results & points, hosting, disputes.",
    "isActive": true,
    "isPrivate": false,
    "isDefault": false,
    "displayOrder": 4,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "name": "Technical Support",
    "slug": "technical_support",
    "description": "Technical issues with the website or system",
    "isActive": false,
    "isPrivate": false,
    "isDefault": false,
    "displayOrder": 4,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "name": "Billing",
    "slug": "billing",
    "description": "Payment issues, refunds, and billing inquiries",
    "isActive": false,
    "isPrivate": false,
    "isDefault": false,
    "displayOrder": 5,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "name": "Event Director / Judge",
    "slug": "event_director_judge",
    "description": "Tools and help for Event Directors and Judges.",
    "isActive": true,
    "isPrivate": false,
    "isDefault": false,
    "displayOrder": 5,
    "audience": "members",
    "requiredRoles": [
      "event_director",
      "judge"
    ]
  },
  {
    "name": "Administration",
    "slug": "administration",
    "description": "Administrative requests and official MECA business",
    "isActive": false,
    "isPrivate": false,
    "isDefault": false,
    "displayOrder": 6,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "name": "Event Disputes",
    "slug": "event_disputes",
    "description": "If you have a dispute at an event, you can choose this department if you are within 15 days of the event.",
    "isActive": false,
    "isPrivate": false,
    "isDefault": false,
    "displayOrder": 6,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "name": "Website & Technical",
    "slug": "website_technical",
    "description": "Problems with the website and feature ideas.",
    "isActive": true,
    "isPrivate": false,
    "isDefault": false,
    "displayOrder": 6,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "name": "Score & Points",
    "slug": "score_points",
    "description": null,
    "isActive": false,
    "isPrivate": false,
    "isDefault": false,
    "displayOrder": 8,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "name": "Triage",
    "slug": "triage",
    "description": "Internal fallback queue for unrouted tickets.",
    "isActive": true,
    "isPrivate": true,
    "isDefault": true,
    "displayOrder": 99,
    "audience": "all",
    "requiredRoles": null
  }
];

export const TARGET_CATEGORIES: SeedCategory[] = [
  {
    "key": "ma_renewal",
    "label": "Renewal / Reactivation",
    "departmentSlug": "membership_account",
    "description": null,
    "displayOrder": 1,
    "isActive": true,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "ma_purchase_issue",
    "label": "Couldn't complete a purchase",
    "departmentSlug": "membership_account",
    "description": null,
    "displayOrder": 2,
    "isActive": true,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "ma_account_login",
    "label": "Account & Login",
    "departmentSlug": "membership_account",
    "description": null,
    "displayOrder": 3,
    "isActive": true,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "ma_meca_id_card",
    "label": "MECA ID Card",
    "departmentSlug": "membership_account",
    "description": null,
    "displayOrder": 4,
    "isActive": true,
    "audience": "members",
    "requiredRoles": null
  },
  {
    "key": "ma_team",
    "label": "Team Membership",
    "departmentSlug": "membership_account",
    "description": null,
    "displayOrder": 5,
    "isActive": true,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "ma_update_info",
    "label": "Update my info",
    "departmentSlug": "membership_account",
    "description": null,
    "displayOrder": 6,
    "isActive": true,
    "audience": "members",
    "requiredRoles": null
  },
  {
    "key": "ma_general",
    "label": "General membership question",
    "departmentSlug": "membership_account",
    "description": null,
    "displayOrder": 7,
    "isActive": true,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "bp_payment",
    "label": "Payment problem",
    "departmentSlug": "billing_payments",
    "description": null,
    "displayOrder": 1,
    "isActive": true,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "bp_invoice",
    "label": "Invoice / Receipt",
    "departmentSlug": "billing_payments",
    "description": null,
    "displayOrder": 2,
    "isActive": true,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "bp_subscription",
    "label": "Subscription / Auto-renew",
    "departmentSlug": "billing_payments",
    "description": null,
    "displayOrder": 3,
    "isActive": true,
    "audience": "members",
    "requiredRoles": null
  },
  {
    "key": "bp_refund",
    "label": "Refund request",
    "departmentSlug": "billing_payments",
    "description": null,
    "displayOrder": 4,
    "isActive": true,
    "audience": "members",
    "requiredRoles": null
  },
  {
    "key": "bp_general",
    "label": "General billing question",
    "departmentSlug": "billing_payments",
    "description": null,
    "displayOrder": 5,
    "isActive": true,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "ss_order",
    "label": "Shop order",
    "departmentSlug": "shop_shipping",
    "description": null,
    "displayOrder": 1,
    "isActive": true,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "ss_shipping",
    "label": "Shipping / Delivery",
    "departmentSlug": "shop_shipping",
    "description": null,
    "displayOrder": 2,
    "isActive": true,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "ss_return_refund",
    "label": "Return / Refund",
    "departmentSlug": "shop_shipping",
    "description": null,
    "displayOrder": 3,
    "isActive": true,
    "audience": "members",
    "requiredRoles": null
  },
  {
    "key": "ss_product",
    "label": "Product question",
    "departmentSlug": "shop_shipping",
    "description": null,
    "displayOrder": 4,
    "isActive": true,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "ss_general",
    "label": "General shop question",
    "departmentSlug": "shop_shipping",
    "description": null,
    "displayOrder": 5,
    "isActive": true,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "eo_registration",
    "label": "Event registration",
    "departmentSlug": "event_operations",
    "description": null,
    "displayOrder": 1,
    "isActive": true,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "eo_results",
    "label": "Competition results / Score & Points",
    "departmentSlug": "event_operations",
    "description": null,
    "displayOrder": 2,
    "isActive": true,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "eo_hosting",
    "label": "Event hosting",
    "departmentSlug": "event_operations",
    "description": null,
    "displayOrder": 3,
    "isActive": true,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "eo_dispute",
    "label": "Event dispute (within 15 days)",
    "departmentSlug": "event_operations",
    "description": null,
    "displayOrder": 4,
    "isActive": true,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "eo_general",
    "label": "General event question",
    "departmentSlug": "event_operations",
    "description": null,
    "displayOrder": 5,
    "isActive": true,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "edj_results_entry",
    "label": "Results entry help",
    "departmentSlug": "event_director_judge",
    "description": null,
    "displayOrder": 1,
    "isActive": true,
    "audience": "members",
    "requiredRoles": null
  },
  {
    "key": "edj_event_mgmt",
    "label": "Event setup / management",
    "departmentSlug": "event_director_judge",
    "description": null,
    "displayOrder": 2,
    "isActive": true,
    "audience": "members",
    "requiredRoles": null
  },
  {
    "key": "edj_judging",
    "label": "Judging / scoring",
    "departmentSlug": "event_director_judge",
    "description": null,
    "displayOrder": 3,
    "isActive": true,
    "audience": "members",
    "requiredRoles": null
  },
  {
    "key": "edj_account",
    "label": "ED / Judge account",
    "departmentSlug": "event_director_judge",
    "description": null,
    "displayOrder": 4,
    "isActive": true,
    "audience": "members",
    "requiredRoles": null
  },
  {
    "key": "edj_general",
    "label": "General (ED / Judge)",
    "departmentSlug": "event_director_judge",
    "description": null,
    "displayOrder": 5,
    "isActive": true,
    "audience": "members",
    "requiredRoles": null
  },
  {
    "key": "wt_bug",
    "label": "Problem with a page (bug)",
    "departmentSlug": "website_technical",
    "description": null,
    "displayOrder": 1,
    "isActive": true,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "wt_login",
    "label": "Login / access issue",
    "departmentSlug": "website_technical",
    "description": null,
    "displayOrder": 2,
    "isActive": true,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "wt_feature",
    "label": "Feature idea",
    "departmentSlug": "website_technical",
    "description": null,
    "displayOrder": 3,
    "isActive": true,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "wt_general",
    "label": "General technical question",
    "departmentSlug": "website_technical",
    "description": null,
    "displayOrder": 4,
    "isActive": true,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "general",
    "label": "General",
    "departmentSlug": "general_support",
    "description": null,
    "displayOrder": 1,
    "isActive": false,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "membership",
    "label": "Membership",
    "departmentSlug": "membership_services",
    "description": null,
    "displayOrder": 2,
    "isActive": false,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "event_registration",
    "label": "Event Registration",
    "departmentSlug": "event_operations",
    "description": null,
    "displayOrder": 3,
    "isActive": false,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "payment",
    "label": "Payment",
    "departmentSlug": "billing",
    "description": null,
    "displayOrder": 4,
    "isActive": false,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "technical",
    "label": "Technical",
    "departmentSlug": "technical_support",
    "description": null,
    "displayOrder": 5,
    "isActive": false,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "competition_results",
    "label": "Competition Results",
    "departmentSlug": "score_points",
    "description": null,
    "displayOrder": 6,
    "isActive": false,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "event_hosting",
    "label": "Event Hosting",
    "departmentSlug": "event_operations",
    "description": null,
    "displayOrder": 7,
    "isActive": false,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "account",
    "label": "Account",
    "departmentSlug": "technical_support",
    "description": null,
    "displayOrder": 8,
    "isActive": false,
    "audience": "all",
    "requiredRoles": null
  },
  {
    "key": "other",
    "label": "Other",
    "departmentSlug": "general_support",
    "description": null,
    "displayOrder": 9,
    "isActive": false,
    "audience": "all",
    "requiredRoles": null
  }
];

export const TARGET_ROUTING_RULES: SeedRoutingRule[] = [
  {
    "name": "Technical",
    "description": null,
    "isActive": true,
    "priority": 0,
    "conditions": {
      "category": "technical"
    },
    "assignToDepartmentSlug": "technical_support",
    "setPriority": null
  },
  {
    "name": "General",
    "description": "General Routing",
    "isActive": true,
    "priority": 10,
    "conditions": {
      "category": "general",
      "keywords": [
        "*"
      ],
      "title_contains": "*",
      "description_contains": "*",
      "user_membership_status": "active"
    },
    "assignToDepartmentSlug": "general_support",
    "setPriority": "medium"
  },
  {
    "name": "Escalate legal matters",
    "description": "Escalate legal matters",
    "isActive": true,
    "priority": 100,
    "conditions": {
      "keywords": [
        "lawsuit",
        "legal action",
        "attorney",
        "lawyer"
      ]
    },
    "assignToDepartmentSlug": null,
    "setPriority": "critical"
  },
  {
    "name": "Escalate event disputes",
    "description": "Escalate event disputes",
    "isActive": true,
    "priority": 90,
    "conditions": {
      "category": "eo_dispute"
    },
    "assignToDepartmentSlug": null,
    "setPriority": "high"
  },
  {
    "name": "Escalate disputes & fraud",
    "description": "Escalate disputes & fraud",
    "isActive": true,
    "priority": 85,
    "conditions": {
      "keywords": [
        "chargeback",
        "fraud",
        "unauthorized",
        "scam",
        "dispute"
      ]
    },
    "assignToDepartmentSlug": null,
    "setPriority": "high"
  },
  {
    "name": "Escalate refund requests",
    "description": "Escalate refund requests",
    "isActive": true,
    "priority": 80,
    "conditions": {
      "keywords": [
        "refund",
        "return",
        "money back"
      ]
    },
    "assignToDepartmentSlug": null,
    "setPriority": "high"
  },
  {
    "name": "Escalate access & payment failures",
    "description": "Escalate access & payment failures",
    "isActive": true,
    "priority": 80,
    "conditions": {
      "keywords": [
        "locked out",
        "can't log in",
        "cannot log in",
        "cant log in",
        "payment failed",
        "double charged",
        "charged twice"
      ]
    },
    "assignToDepartmentSlug": null,
    "setPriority": "high"
  }
];
