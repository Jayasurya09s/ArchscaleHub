import {
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  ChartNoAxesCombined,
  CircleDollarSign,
  ContactRound,
  FileStack,
  Images,
  Landmark,
  Megaphone,
  Network,
  PackageSearch,
  Palette,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UsersRound
} from "lucide-react";

export const applicationGroups = [
  {
    name: "Projects",
    description: "Delivery, documentation and project decisions",
    apps: [
      {
        name: "Projects",
        description: "Timelines, milestones and delivery health",
        icon: Building2,
        meta: "3 active"
      },
      {
        name: "Documents",
        description: "Plans, contracts and studio files",
        icon: FileStack,
        meta: "12 recent"
      },
      {
        name: "Approvals",
        description: "Reviews, decisions and sign-off",
        icon: BadgeCheck,
        meta: "4 pending"
      },
      {
        name: "Site Visits",
        description: "Schedules, observations and reports",
        icon: CalendarCheck,
        meta: "2 today"
      }
    ]
  },
  {
    name: "Marketing & Sales",
    description: "Pipeline, relationships and market presence",
    apps: [
      {
        name: "Marketing",
        description: "Campaigns, outreach and publishing",
        icon: Megaphone,
        meta: "3 drafts"
      },
      {
        name: "Clients & CRM",
        description: "Leads, conversations and relationships",
        icon: ContactRound,
        meta: "2 new"
      }
    ]
  },
  {
    name: "Brand",
    description: "Identity, portfolio and publishing tools",
    apps: [
      {
        name: "Portfolio",
        description: "Selected work and presentation stories",
        icon: Images,
        meta: "18 projects"
      },
      {
        name: "Brand Kits",
        description: "Identity standards and reusable assets",
        icon: Palette,
        meta: "Updated"
      },
      {
        name: "Social Media",
        description: "Content planning and channel publishing",
        icon: Network,
        meta: "6 queued"
      }
    ]
  },
  {
    name: "Human Resources",
    description: "People, policies and team operations",
    apps: [
      {
        name: "Human Resources",
        description: "People directory, leave and team records",
        icon: UsersRound,
        meta: "18 people"
      }
    ]
  },
  {
    name: "Accounts",
    description: "Financial operations and expenditure",
    apps: [
      {
        name: "Finance",
        description: "Budgets, invoices and cash flow",
        icon: CircleDollarSign,
        meta: "On track"
      },
      {
        name: "Expenses",
        description: "Claims, receipts and approvals",
        icon: ReceiptText,
        meta: "7 pending"
      }
    ]
  },
  {
    name: "Resources",
    description: "Shared knowledge, suppliers and materials",
    apps: [
      {
        name: "Resources",
        description: "Templates, standards and guides",
        icon: BookOpen,
        meta: "24 items"
      },
      {
        name: "Vendors",
        description: "Approved partners and supplier records",
        icon: PackageSearch,
        meta: "32 active"
      },
      {
        name: "Materials Library",
        description: "Materials, textures and specifications",
        icon: Sparkles,
        meta: "46 items"
      },
      {
        name: "Intranet",
        description: "Shared updates, policies and internal links",
        icon: Landmark,
        meta: "Standard"
      }
    ]
  }
];

export const applications = applicationGroups.flatMap((group) => group.apps);

export const navigation = [
  { label: "Central Hub", icon: BriefcaseBusiness },
  { label: "Activity", icon: ChartNoAxesCombined },
  { label: "Directory", icon: ContactRound }
];

export const roleAccess = [
  {
    label: "Projects",
    icon: Building2,
    appNames: ["Projects", "Documents", "Approvals", "Site Visits", "Intranet"]
  },
  {
    label: "Sales & Marketing",
    icon: Megaphone,
    appNames: ["Marketing", "Clients & CRM", "Intranet"]
  },
  {
    label: "Brand",
    icon: Palette,
    appNames: ["Portfolio", "Social Media", "Intranet"]
  },
  {
    label: "Human Resources",
    icon: UsersRound,
    appNames: ["Human Resources", "Intranet"]
  },
  {
    label: "Accounts",
    icon: ReceiptText,
    appNames: ["Finance", "Expenses", "Intranet"]
  },
  {
    label: "Studio Owner",
    icon: ShieldCheck,
    appNames: applications.map((app) => app.name)
  }
];
