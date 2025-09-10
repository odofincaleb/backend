import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Configure testing library
configure({ testIdAttribute: 'data-testid' });

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock fetch
global.fetch = jest.fn();

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock electron API
global.electronAPI = {
  getVersion: jest.fn(() => Promise.resolve('1.0.0')),
  showMessageBox: jest.fn(() => Promise.resolve({ response: 0 })),
  showSaveDialog: jest.fn(() => Promise.resolve({ filePath: 'test.txt' })),
  showOpenDialog: jest.fn(() => Promise.resolve({ filePaths: ['test.txt'] })),
  onMenuNewCampaign: jest.fn(),
  onMenuSettings: jest.fn(),
  removeAllListeners: jest.fn(),
};

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/dashboard' }),
}));

// Mock react-query
jest.mock('react-query', () => ({
  useQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isLoading: false,
    error: null,
  })),
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }) => children,
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
  Toaster: () => null,
}));

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

// Mock styled-components
jest.mock('styled-components', () => ({
  createGlobalStyle: () => 'div',
  ThemeProvider: ({ children }) => children,
  styled: {
    div: () => 'div',
    button: () => 'button',
    input: () => 'input',
    textarea: () => 'textarea',
    select: () => 'select',
    label: () => 'label',
    span: () => 'span',
    h1: () => 'h1',
    h2: () => 'h2',
    h3: () => 'h3',
    p: () => 'p',
    ul: () => 'ul',
    li: () => 'li',
    nav: () => 'nav',
    main: () => 'main',
    header: () => 'header',
    footer: () => 'footer',
    section: () => 'section',
    article: () => 'article',
    aside: () => 'aside',
    form: () => 'form',
    fieldset: () => 'fieldset',
    legend: () => 'legend',
    table: () => 'table',
    thead: () => 'thead',
    tbody: () => 'tbody',
    tr: () => 'tr',
    th: () => 'th',
    td: () => 'td',
    img: () => 'img',
    a: () => 'a',
    strong: () => 'strong',
    em: () => 'em',
    code: () => 'code',
    pre: () => 'pre',
    blockquote: () => 'blockquote',
    hr: () => 'hr',
    br: () => 'br',
  },
  css: jest.fn(),
  keyframes: jest.fn(),
  withTheme: jest.fn(),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
    span: 'span',
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    p: 'p',
    img: 'img',
    svg: 'svg',
    path: 'path',
    circle: 'circle',
    rect: 'rect',
    line: 'line',
    polygon: 'polygon',
    polyline: 'polyline',
    ellipse: 'ellipse',
    g: 'g',
    defs: 'defs',
    clipPath: 'clipPath',
    mask: 'mask',
    pattern: 'pattern',
    linearGradient: 'linearGradient',
    radialGradient: 'radialGradient',
    stop: 'stop',
    animate: jest.fn(),
    useAnimation: jest.fn(),
    useMotionValue: jest.fn(),
    useTransform: jest.fn(),
    useSpring: jest.fn(),
    useViewportScroll: jest.fn(),
    useElementScroll: jest.fn(),
    useDragControls: jest.fn(),
    useAnimationControls: jest.fn(),
    usePresence: jest.fn(),
    AnimatePresence: ({ children }) => children,
    LayoutGroup: ({ children }) => children,
    MotionConfig: ({ children }) => children,
  },
  AnimatePresence: ({ children }) => children,
  LayoutGroup: ({ children }) => children,
  MotionConfig: ({ children }) => children,
}));

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Menu: () => 'Menu',
  X: () => 'X',
  User: () => 'User',
  LogOut: () => 'LogOut',
  Bell: () => 'Bell',
  Moon: () => 'Moon',
  Sun: () => 'Sun',
  LayoutDashboard: () => 'LayoutDashboard',
  Target: () => 'Target',
  Globe: () => 'Globe',
  Settings: () => 'Settings',
  Key: () => 'Key',
  Plus: () => 'Plus',
  Play: () => 'Play',
  Pause: () => 'Pause',
  Trash2: () => 'Trash2',
  CheckCircle: () => 'CheckCircle',
  XCircle: () => 'XCircle',
  Clock: () => 'Clock',
  TrendingUp: () => 'TrendingUp',
  FileText: () => 'FileText',
  Eye: () => 'Eye',
  EyeOff: () => 'EyeOff',
  Mail: () => 'Mail',
  Lock: () => 'Lock',
  Loader: () => 'Loader',
  ChevronLeft: () => 'ChevronLeft',
  ChevronRight: () => 'ChevronRight',
  Check: () => 'Check',
  Star: () => 'Star',
  Crown: () => 'Crown',
  ArrowLeft: () => 'ArrowLeft',
  Save: () => 'Save',
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date) => '2024-01-01'),
  parseISO: jest.fn((date) => new Date(date)),
  isValid: jest.fn(() => true),
  addDays: jest.fn((date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)),
  subDays: jest.fn((date, days) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000)),
  differenceInDays: jest.fn(() => 1),
  isAfter: jest.fn(() => true),
  isBefore: jest.fn(() => false),
  isEqual: jest.fn(() => false),
}));

// Mock recharts
jest.mock('recharts', () => ({
  LineChart: ({ children }) => children,
  Line: () => 'Line',
  XAxis: () => 'XAxis',
  YAxis: () => 'YAxis',
  CartesianGrid: () => 'CartesianGrid',
  Tooltip: () => 'Tooltip',
  Legend: () => 'Legend',
  ResponsiveContainer: ({ children }) => children,
  BarChart: ({ children }) => children,
  Bar: () => 'Bar',
  PieChart: ({ children }) => children,
  Pie: () => 'Pie',
  Cell: () => 'Cell',
  AreaChart: ({ children }) => children,
  Area: () => 'Area',
}));

// Mock react-beautiful-dnd
jest.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children }) => children,
  Droppable: ({ children }) => children({ innerRef: jest.fn(), droppableProps: {} }),
  Draggable: ({ children }) => children({ innerRef: jest.fn(), draggableProps: {}, dragHandleProps: {} }),
}));

// Setup test environment
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset localStorage
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  
  // Reset sessionStorage
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
  
  // Reset fetch
  fetch.mockClear();
});

// Global test utilities
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  subscriptionTier: 'trial',
  postsPublishedThisMonth: 0,
  totalPostsPublished: 0,
  maxConcurrentCampaigns: 1,
  supportTier: 'basic',
  createdAt: '2024-01-01T00:00:00Z'
};

export const mockCampaign = {
  id: 'test-campaign-id',
  topic: 'Test Topic',
  context: 'Test context for campaign',
  toneOfVoice: 'conversational',
  writingStyle: 'pas',
  imperfectionList: ['add_personal_opinion'],
  schedule: '24h',
  status: 'active',
  nextPublishAt: '2024-01-02T00:00:00Z',
  wordpressSite: {
    name: 'Test Site',
    url: 'https://testsite.com'
  },
  postsPublished: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

export const mockWordPressSite = {
  id: 'test-site-id',
  siteName: 'Test Site',
  siteUrl: 'https://testsite.com',
  username: 'testuser',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

export const mockLicense = {
  id: 'test-license-id',
  licenseKey: 'TEST-1234-ABCD-5678',
  subscriptionTier: 'hobbyist',
  postsPerMonth: 25,
  maxCampaigns: 1,
  supportTier: 'basic',
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z'
};

