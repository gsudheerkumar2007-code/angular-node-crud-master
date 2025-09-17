import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ClienteService } from './cliente.service';
import { Cliente, ApiResponse } from '../interfaces/cliente.interface';

describe('ClienteService', () => {
  let service: ClienteService;
  let httpMock: HttpTestingController;

  const mockCliente: Cliente = {
    _id: '123',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '1234567890',
    address: '123 Main St',
    birthDate: new Date('1990-01-01'),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockApiResponse: ApiResponse<Cliente[]> = {
    data: [mockCliente],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      pages: 1
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ClienteService]
    });
    service = TestBed.inject(ClienteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('save', () => {
    it('should create a new client', () => {
      const newCliente: Cliente = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '0987654321'
      };

      service.save(newCliente).subscribe(client => {
        expect(client).toEqual(mockCliente);
      });

      const req = httpMock.expectOne('/api/client');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newCliente);
      req.flush(mockCliente);
    });

    it('should handle server errors', () => {
      const newCliente: Cliente = {
        name: 'Jane Doe',
        email: 'invalid-email'
      };

      service.save(newCliente).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Validation error');
        }
      });

      const req = httpMock.expectOne('/api/client');
      req.flush({
        error: 'Validation error',
        details: [{ field: 'email', message: 'must be a valid email' }]
      }, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('update', () => {
    it('should update an existing client', () => {
      const clientId = '123';
      const updateData = { name: 'John Updated' };

      service.update(clientId, updateData).subscribe(client => {
        expect(client).toEqual(mockCliente);
      });

      const req = httpMock.expectOne(`/api/client/${clientId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateData);
      req.flush(mockCliente);
    });

    it('should handle empty client ID', () => {
      service.update('', { name: 'Test' }).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Client ID is required');
        }
      });

      httpMock.expectNone('/api/client/');
    });

    it('should handle client not found', () => {
      const clientId = 'nonexistent';
      const updateData = { name: 'Test' };

      service.update(clientId, updateData).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Client not found');
        }
      });

      const req = httpMock.expectOne(`/api/client/${clientId}`);
      req.flush({
        error: 'Client not found'
      }, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('getAll', () => {
    it('should get all clients with pagination', () => {
      service.getAll(1, 10).subscribe(clients => {
        expect(clients).toEqual([mockCliente]);
      });

      const req = httpMock.expectOne('/api/client?page=1&limit=10');
      expect(req.request.method).toBe('GET');
      req.flush(mockApiResponse);
    });

    it('should handle array response format', () => {
      service.getAll().subscribe(clients => {
        expect(clients).toEqual([mockCliente]);
      });

      const req = httpMock.expectOne('/api/client?page=1&limit=10');
      req.flush([mockCliente]);
    });

    it('should use default pagination parameters', () => {
      service.getAll().subscribe();

      const req = httpMock.expectOne('/api/client?page=1&limit=10');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('getById', () => {
    it('should get client by ID', () => {
      const clientId = '123';

      service.getById(clientId).subscribe(client => {
        expect(client).toEqual(mockCliente);
      });

      const req = httpMock.expectOne(`/api/client/${clientId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCliente);
    });

    it('should handle empty client ID', () => {
      service.getById('').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Client ID is required');
        }
      });

      httpMock.expectNone('/api/client/');
    });

    it('should handle client not found', () => {
      const clientId = 'nonexistent';

      service.getById(clientId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Client not found');
        }
      });

      const req = httpMock.expectOne(`/api/client/${clientId}`);
      req.flush({
        error: 'Client not found'
      }, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('delete', () => {
    it('should delete client by ID', () => {
      const clientId = '123';

      service.delete(clientId).subscribe(response => {
        expect(response.message).toBe('Client deleted successfully');
      });

      const req = httpMock.expectOne(`/api/client/${clientId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ message: 'Client deleted successfully' });
    });

    it('should handle empty client ID', () => {
      service.delete('').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Client ID is required');
        }
      });

      httpMock.expectNone('/api/client/');
    });

    it('should handle forbidden deletion', () => {
      const clientId = '123';

      service.delete(clientId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Forbidden');
        }
      });

      const req = httpMock.expectOne(`/api/client/${clientId}`);
      req.flush({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      }, { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('getAllWithPagination', () => {
    it('should get clients with full pagination response', () => {
      service.getAllWithPagination(2, 5).subscribe(response => {
        expect(response).toEqual(mockApiResponse);
        expect(response.data).toEqual([mockCliente]);
        expect(response.pagination?.page).toBe(1);
        expect(response.pagination?.limit).toBe(10);
      });

      const req = httpMock.expectOne('/api/client?page=2&limit=5');
      expect(req.request.method).toBe('GET');
      req.flush(mockApiResponse);
    });

    it('should use default pagination parameters', () => {
      service.getAllWithPagination().subscribe();

      const req = httpMock.expectOne('/api/client?page=1&limit=10');
      expect(req.request.method).toBe('GET');
      req.flush(mockApiResponse);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', () => {
      service.getAll().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Network error');
        }
      });

      const req = httpMock.expectOne('/api/client?page=1&limit=10');
      req.error(new ErrorEvent('Network error', {
        message: 'Connection failed'
      }));
    });

    it('should handle detailed validation errors', () => {
      const newCliente: Cliente = {
        name: '',
        email: 'invalid'
      };

      service.save(newCliente).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('name: Name is required');
          expect(error.message).toContain('email: Must be a valid email');
        }
      });

      const req = httpMock.expectOne('/api/client');
      req.flush({
        error: 'Validation error',
        details: [
          { field: 'name', message: 'Name is required' },
          { field: 'email', message: 'Must be a valid email' }
        ]
      }, { status: 400, statusText: 'Bad Request' });
    });

    it('should handle generic server errors', () => {
      service.getAll().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Server error: 500');
        }
      });

      const req = httpMock.expectOne('/api/client?page=1&limit=10');
      req.flush('Internal Server Error', {
        status: 500,
        statusText: 'Internal Server Error'
      });
    });
  });
});