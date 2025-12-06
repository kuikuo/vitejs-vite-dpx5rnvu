// Mock API service for text and title data
export interface ApiEntry {
    id: number;
    title: string;
    content: string;
    createdAt: string;
  }
  
  const mockApiData: ApiEntry[] = [
    {
      id: 1,
      title: "React Introduction",
      content: "React is a declarative, efficient, and flexible JavaScript library for building user interfaces.",
      createdAt: "2024-01-15T10:30:00Z"
    },
    {
      id: 2,
      title: "Vite Overview",
      content: "Vite is a build tool that provides a faster and leaner development experience for modern web projects.",
      createdAt: "2024-01-20T14:45:00Z"
    },
    {
      id: 3,
      title: "TypeScript Benefits",
      content: "TypeScript adds static typing to JavaScript, which helps catch errors early and improves code quality.",
      createdAt: "2024-01-25T09:15:00Z"
    },
    {
      id: 4,
      title: "CSS Flexbox Guide",
      content: "Flexbox is a CSS layout module that makes it easier to design flexible and responsive layouts.",
      createdAt: "2024-02-01T16:20:00Z"
    },
    {
      id: 5,
      title: "JavaScript ES6 Features",
      content: "ES6 introduced many new features like arrow functions, template literals, and destructuring.",
      createdAt: "2024-02-05T11:10:00Z"
    }
  ];
  
  // Simulate network delay
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  export const apiService = {
    async getEntries(): Promise<ApiEntry[]> {
      await delay(500);
      return [...mockApiData];
    },
    
    async getRandomEntry(): Promise<ApiEntry> {
      await delay(300);
      const randomIndex = Math.floor(Math.random() * mockApiData.length);
      return { ...mockApiData[randomIndex] };
    },
    
    async searchEntries(keyword: string): Promise<ApiEntry[]> {
      await delay(400);
      const lowerKeyword = keyword.toLowerCase();
      return mockApiData.filter(entry => 
        entry.title.toLowerCase().includes(lowerKeyword) ||
        entry.content.toLowerCase().includes(lowerKeyword)
      );
    }
  };