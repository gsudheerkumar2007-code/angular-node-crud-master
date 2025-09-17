import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { of, throwError, BehaviorSubject } from 'rxjs';

import { ClienteListComponent } from './cliente-list.component';
import { ClienteService } from '../services/cliente.service';
import { ExportService } from '../services/export.service';
import { Cliente, ApiResponse } from '../interfaces/cliente.interface';

describe('ClienteListComponent', () => {
  let component: ClienteListComponent;
  let fixture: ComponentFixture<ClienteListComponent>;
  let clienteService: jasmine.SpyObj<ClienteService>;
  let exportService: jasmine.SpyObj<ExportService>;

  const mockClientes: Cliente[] = [
    {
      _id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
      address: '123 Main St',
      birthDate: new Date('1990-01-01'),
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    },
    {
      _id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '0987654321',
      address: '456 Oak Ave',
      birthDate: new Date('1985-05-15'),
      createdAt: new Date('2023-01-02'),
      updatedAt: new Date('2023-01-02')
    }
  ];

  const mockApiResponse: ApiResponse<Cliente[]> = {
    data: mockClientes,
    pagination: {
      page: 1,
      limit: 10,
      total: 2,
      pages: 1
    }
  };

  beforeEach(async () => {
    const clienteServiceSpy = jasmine.createSpyObj('ClienteService', [
      'getAllWithPagination',
      'delete'
    ]);
    const exportServiceSpy = jasmine.createSpyObj('ExportService', ['exportExcel']);

    await TestBed.configureTestingModule({
      declarations: [ClienteListComponent],
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: ClienteService, useValue: clienteServiceSpy },
        { provide: ExportService, useValue: exportServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClienteListComponent);
    component = fixture.componentInstance;
    clienteService = TestBed.inject(ClienteService) as jasmine.SpyObj<ClienteService>;
    exportService = TestBed.inject(ExportService) as jasmine.SpyObj<ExportService>;

    // Default service responses
    clienteService.getAllWithPagination.and.returnValue(of(mockApiResponse));
    clienteService.delete.and.returnValue(of({ message: 'Client deleted successfully' }));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should load clients on init', () => {
      component.ngOnInit();

      expect(clienteService.getAllWithPagination).toHaveBeenCalledWith(1, 10);
      expect(component.totalItems).toBe(2);
      expect(component.totalPages).toBe(1);
      expect(component.currentPage).toBe(1);
    });

    it('should handle loading state', () => {
      component.ngOnInit();

      expect(component.loading).toBe(false);
    });

    it('should set default pagination values', () => {
      expect(component.currentPage).toBe(1);
      expect(component.pageSize).toBe(10);
      expect(component.totalItems).toBe(0);
      expect(component.totalPages).toBe(0);
      expect(component.pageSizeOptions).toEqual([5, 10, 25, 50]);
    });
  });

  describe('Data Loading', () => {
    it('should display clients in table', async () => {
      component.ngOnInit();
      fixture.detectChanges();
      await fixture.whenStable();

      const tableRows = fixture.debugElement.queryAll(By.css('tbody tr'));
      expect(tableRows.length).toBe(2);

      const firstRowCells = tableRows[0].queryAll(By.css('td'));
      expect(firstRowCells[0].nativeElement.textContent.trim()).toContain('John Doe');
    });

    it('should handle empty client list', async () => {
      clienteService.getAllWithPagination.and.returnValue(of({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 }
      }));

      component.ngOnInit();
      fixture.detectChanges();
      await fixture.whenStable();

      const noDataMessage = fixture.debugElement.query(By.css('td[colspan]'));
      expect(noDataMessage.nativeElement.textContent).toContain('No clients found');
    });

    it('should handle service errors', async () => {
      clienteService.getAllWithPagination.and.returnValue(
        throwError(() => new Error('Service error'))
      );

      component.ngOnInit();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.error).toBe('Service error');
      expect(component.loading).toBe(false);

      const errorAlert = fixture.debugElement.query(By.css('.alert-danger'));
      expect(errorAlert.nativeElement.textContent).toContain('Service error');
    });
  });

  describe('Sorting', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should sort by name ascending', () => {
      component.orderBy('name');

      expect(component.fieldOrderBy).toBe('name');
      expect(component.multiplierOrderBy).toBe(1);
    });

    it('should toggle sort direction on same field', () => {
      component.orderBy('name');
      component.orderBy('name');

      expect(component.fieldOrderBy).toBe('name');
      expect(component.multiplierOrderBy).toBe(-1);
    });

    it('should reset sort direction when changing field', () => {
      component.orderBy('name');
      component.orderBy('email');

      expect(component.fieldOrderBy).toBe('email');
      expect(component.multiplierOrderBy).toBe(1);
    });

    it('should sort data correctly', () => {
      const unsortedData = [
        { name: 'Zebra', email: 'z@test.com' } as Cliente,
        { name: 'Apple', email: 'a@test.com' } as Cliente
      ];

      component['clientListSubject'].next(unsortedData);
      component.orderBy('name');

      component.clientList$.subscribe(sortedData => {
        expect(sortedData[0].name).toBe('Apple');
        expect(sortedData[1].name).toBe('Zebra');
      });
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should change page', () => {
      component.totalPages = 3;
      component.onPageChange(2);

      expect(component.currentPage).toBe(2);
      expect(clienteService.getAllWithPagination).toHaveBeenCalledWith(2, 10);
    });

    it('should not change to invalid page', () => {
      component.totalPages = 3;
      component.currentPage = 2;

      component.onPageChange(0); // Invalid page
      expect(component.currentPage).toBe(2);

      component.onPageChange(5); // Page beyond total
      expect(component.currentPage).toBe(2);

      component.onPageChange(2); // Same page
      expect(component.currentPage).toBe(2);
    });

    it('should change page size and reset to first page', () => {
      component.currentPage = 3;
      component.onPageSizeChange(25);

      expect(component.pageSize).toBe(25);
      expect(component.currentPage).toBe(1);
      expect(clienteService.getAllWithPagination).toHaveBeenCalledWith(1, 25);
    });

    it('should generate correct pagination range', () => {
      component.currentPage = 3;
      component.totalPages = 10;

      const range = component.getPaginationRange();
      expect(range).toEqual([1, 2, 3, 4, 5]);
    });

    it('should generate pagination range near end', () => {
      component.currentPage = 9;
      component.totalPages = 10;

      const range = component.getPaginationRange();
      expect(range).toEqual([6, 7, 8, 9, 10]);
    });

    it('should display correct pagination info', () => {
      component.currentPage = 2;
      component.pageSize = 10;
      component.totalItems = 25;

      const info = component.paginationInfo;
      expect(info).toBe('Showing 11-20 of 25 results');
    });

    it('should display pagination controls when there are multiple pages', async () => {
      clienteService.getAllWithPagination.and.returnValue(of({
        data: mockClientes,
        pagination: { page: 1, limit: 10, total: 25, pages: 3 }
      }));

      component.ngOnInit();
      fixture.detectChanges();
      await fixture.whenStable();

      const paginationNav = fixture.debugElement.query(By.css('nav[aria-label="Client list pagination"]'));
      expect(paginationNav).toBeTruthy();

      const pageButtons = fixture.debugElement.queryAll(By.css('.page-link'));
      expect(pageButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Client Deletion', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
      spyOn(window, 'confirm').and.returnValue(true);
    });

    it('should delete client on confirmation', () => {
      component.onRemove('1');

      expect(clienteService.delete).toHaveBeenCalledWith('1');
      expect(clienteService.getAllWithPagination).toHaveBeenCalled();
    });

    it('should not delete client when cancelled', () => {
      (window.confirm as jasmine.Spy).and.returnValue(false);

      component.onRemove('1');

      expect(clienteService.delete).not.toHaveBeenCalled();
    });

    it('should handle invalid client ID', () => {
      spyOn(console, 'error');

      component.onRemove('');

      expect(console.error).toHaveBeenCalledWith('Invalid client ID');
      expect(clienteService.delete).not.toHaveBeenCalled();
    });

    it('should handle deletion errors', () => {
      clienteService.delete.and.returnValue(
        throwError(() => new Error('Delete failed'))
      );

      component.onRemove('1');

      expect(component.error).toBe('Delete failed');
    });
  });

  describe('Export Functionality', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should export client data', () => {
      component.export();

      expect(exportService.exportExcel).toHaveBeenCalledWith(mockClientes, 'clients');
    });

    it('should handle empty data export', () => {
      component['clientListSubject'].next([]);
      spyOn(console, 'warn');

      component.export();

      expect(console.warn).toHaveBeenCalledWith('No data to export');
      expect(exportService.exportExcel).not.toHaveBeenCalled();
    });

    it('should handle export errors', () => {
      exportService.exportExcel.and.throwError('Export failed');
      spyOn(console, 'error');

      component.export();

      expect(console.error).toHaveBeenCalled();
      expect(component.error).toBe('Failed to export data');
    });
  });

  describe('Component Lifecycle', () => {
    it('should complete subjects on destroy', () => {
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });

  describe('Track By Function', () => {
    it('should return client ID for tracking', () => {
      const client = { _id: '123', name: 'Test' } as Cliente;
      const result = component.trackByClientId(0, client);

      expect(result).toBe('123');
    });

    it('should return index when no ID available', () => {
      const client = { name: 'Test' } as Cliente;
      const result = component.trackByClientId(5, client);

      expect(result).toBe('5');
    });
  });

  describe('UI Elements', () => {
    beforeEach(async () => {
      component.ngOnInit();
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should display loading indicator', () => {
      component.loading = true;
      fixture.detectChanges();

      const loadingIndicator = fixture.debugElement.query(By.css('.spinner-border'));
      expect(loadingIndicator).toBeTruthy();
    });

    it('should display error message', () => {
      component.error = 'Test error message';
      component.loading = false;
      fixture.detectChanges();

      const errorAlert = fixture.debugElement.query(By.css('.alert-danger'));
      expect(errorAlert.nativeElement.textContent).toContain('Test error message');
    });

    it('should have Add Client button', () => {
      const addButton = fixture.debugElement.query(By.css('a[routerLink="/clients/add"]'));
      expect(addButton).toBeTruthy();
      expect(addButton.nativeElement.textContent.trim()).toContain('Add Client');
    });

    it('should have Export Excel button', () => {
      const exportButton = fixture.debugElement.query(By.css('button'));
      expect(exportButton.nativeElement.textContent.trim()).toContain('Export Excel');
    });

    it('should display sortable column headers', () => {
      const sortableHeaders = fixture.debugElement.queryAll(By.css('th.clickable'));
      expect(sortableHeaders.length).toBeGreaterThan(0);

      const nameHeader = sortableHeaders.find(header =>
        header.nativeElement.textContent.includes('Name')
      );
      expect(nameHeader).toBeTruthy();
    });

    it('should show edit and delete buttons for each client', () => {
      const editButtons = fixture.debugElement.queryAll(By.css('a.btn-outline-primary'));
      const deleteButtons = fixture.debugElement.queryAll(By.css('button.btn-outline-danger'));

      expect(editButtons.length).toBe(mockClientes.length);
      expect(deleteButtons.length).toBe(mockClientes.length);
    });
  });
});