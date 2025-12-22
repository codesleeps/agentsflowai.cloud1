/**
 * Unit tests for Leads API
 * 
 * Tests the /api/leads endpoint for:
 * - GET: Fetching leads with filters
 * - POST: Creating new leads with validation
 */

import { NextRequest } from 'next/server';

// Mock the database module
jest.mock('@/server-lib/internal-db-query', () => ({
  queryInternalDatabase: jest.fn(),
}));

import { GET, POST } from '../leads/route';
import { queryInternalDatabase } from '@/server-lib/internal-db-query';

const mockQuery = queryInternalDatabase as jest.MockedFunction<typeof queryInternalDatabase>;

describe('GET /api/leads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches all leads with default limit', async () => {
    const mockLeads = [
      { id: '1', name: 'John Doe', email: 'john@example.com', status: 'new' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'qualified' },
    ];
    mockQuery.mockResolvedValue(mockLeads);

    const request = new NextRequest('http://localhost:3000/api/leads');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockLeads);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM leads'),
      ['50']
    );
  });

  test('filters leads by status', async () => {
    const mockLeads = [
      { id: '1', name: 'John Doe', email: 'john@example.com', status: 'qualified' },
    ];
    mockQuery.mockResolvedValue(mockLeads);

    const request = new NextRequest('http://localhost:3000/api/leads?status=qualified');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockLeads);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('status = $1'),
      ['qualified', '50']
    );
  });

  test('filters leads by source', async () => {
    const mockLeads = [
      { id: '1', name: 'John Doe', email: 'john@example.com', source: 'website' },
    ];
    mockQuery.mockResolvedValue(mockLeads);

    const request = new NextRequest('http://localhost:3000/api/leads?source=website');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockLeads);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('source = $1'),
      ['website', '50']
    );
  });

  test('filters leads by both status and source', async () => {
    const mockLeads = [
      { id: '1', name: 'John Doe', email: 'john@example.com', status: 'new', source: 'chat' },
    ];
    mockQuery.mockResolvedValue(mockLeads);

    const request = new NextRequest('http://localhost:3000/api/leads?status=new&source=chat');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('status = $1'),
      expect.arrayContaining(['new', 'chat'])
    );
  });

  test('respects custom limit parameter', async () => {
    mockQuery.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/leads?limit=10');
    await GET(request);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT $1'),
      ['10']
    );
  });

  test('returns 500 on database error', async () => {
    mockQuery.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/leads');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch leads' });
  });
});

describe('POST /api/leads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates a lead with required fields only', async () => {
    const newLead = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      source: 'website',
    };
    mockQuery.mockResolvedValue([newLead]);

    const request = new NextRequest('http://localhost:3000/api/leads', {
      method: 'POST',
      body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual(newLead);
  });

  test('creates a lead with all fields', async () => {
    const newLead = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      company: 'Acme Inc',
      phone: '+1234567890',
      source: 'referral',
      budget: 'high',
      timeline: 'immediate',
      notes: 'Important lead',
    };
    mockQuery.mockResolvedValue([newLead]);

    const request = new NextRequest('http://localhost:3000/api/leads', {
      method: 'POST',
      body: JSON.stringify(newLead),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual(newLead);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO leads'),
      expect.arrayContaining([
        'John Doe',
        'john@example.com',
        'Acme Inc',
        '+1234567890',
        'referral',
        'high',
        'immediate',
        'Important lead',
      ])
    );
  });

  test('returns 400 when name is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/leads', {
      method: 'POST',
      body: JSON.stringify({ email: 'john@example.com' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Name and email are required' });
  });

  test('returns 400 when email is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/leads', {
      method: 'POST',
      body: JSON.stringify({ name: 'John Doe' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Name and email are required' });
  });

  test('returns 400 when both name and email are missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/leads', {
      method: 'POST',
      body: JSON.stringify({ company: 'Acme Inc' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Name and email are required' });
  });

  test('uses default source when not provided', async () => {
    const newLead = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      source: 'website',
    };
    mockQuery.mockResolvedValue([newLead]);

    const request = new NextRequest('http://localhost:3000/api/leads', {
      method: 'POST',
      body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' }),
    });
    await POST(request);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(['website'])
    );
  });

  test('returns 500 on database error', async () => {
    mockQuery.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/leads', {
      method: 'POST',
      body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to create lead' });
  });
});
