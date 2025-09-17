import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ClienteService } from '../services/cliente.service';
import { BehaviorSubject, Subject, Observable, EMPTY } from 'rxjs';
import { Cliente, ApiResponse } from '../interfaces/cliente.interface';
import { ExportService } from '../services/export.service';
import { takeUntil, catchError, finalize } from 'rxjs/operators';

@Component({
  selector: 'cliente-list',
  templateUrl: './cliente-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClienteListComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly clientListSubject = new BehaviorSubject<Cliente[]>([]);

  fieldOrderBy: keyof Cliente = 'name';
  multiplierOrderBy: 1 | -1 = 1;
  loading = false;
  error: string | null = null;

  // Pagination properties
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  pageSizeOptions = [5, 10, 25, 50];

  clientList$: Observable<Cliente[]> = this.clientListSubject.asObservable();

  constructor(
    private clienteService: ClienteService,
    private exportService: ExportService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadList();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadList(): void {
    this.loading = true;
    this.error = null;

    this.clienteService.getAllWithPagination(this.currentPage, this.pageSize)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading clients:', error);
          this.error = error.message || 'Failed to load clients';
          return EMPTY;
        }),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: ApiResponse<Cliente[]>) => {
          const data = response.data || [];
          const sortedData = this.sortData(data);
          this.clientListSubject.next(sortedData);

          // Update pagination info
          if (response.pagination) {
            this.totalItems = response.pagination.total;
            this.totalPages = response.pagination.pages;
            this.currentPage = response.pagination.page;
          }
        }
      });
  }

  private sortData(data: Cliente[]): Cliente[] {
    return [...data].sort((a, b) => {
      const aValue = a[this.fieldOrderBy];
      const bValue = b[this.fieldOrderBy];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      let comparison = 0;
      if (aValue > bValue) {
        comparison = 1;
      } else if (aValue < bValue) {
        comparison = -1;
      }

      return comparison * this.multiplierOrderBy;
    });
  }

  onRemove(id: string): void {
    if (!id) {
      console.error('Invalid client ID');
      return;
    }

    if (!confirm('Are you sure you want to delete this client?')) {
      return;
    }

    this.clienteService.delete(id)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error deleting client:', error);
          this.error = error.message || 'Failed to delete client';
          return EMPTY;
        })
      )
      .subscribe({
        next: () => {
          this.loadList();
        }
      });
  }

  export(): void {
    const currentData = this.clientListSubject.value;

    if (!currentData || currentData.length === 0) {
      console.warn('No data to export');
      return;
    }

    try {
      this.exportService.exportExcel(currentData, 'clients');
    } catch (error) {
      console.error('Error exporting data:', error);
      this.error = 'Failed to export data';
    }
  }

  orderBy(field: keyof Cliente): void {
    if (field !== this.fieldOrderBy) {
      this.fieldOrderBy = field;
      this.multiplierOrderBy = 1;
    } else {
      this.multiplierOrderBy *= -1;
    }

    const currentData = this.clientListSubject.value;
    const sortedData = this.sortData(currentData);
    this.clientListSubject.next(sortedData);
  }

  trackByClientId(index: number, client: Cliente): string {
    return client._id || index.toString();
  }

  // Pagination methods
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadList();
    }
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 1; // Reset to first page
    this.loadList();
  }

  getPaginationRange(): number[] {
    const range = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

    // Adjust start page if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      range.push(i);
    }
    return range;
  }

  get paginationInfo(): string {
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.totalItems);
    return `Showing ${start}-${end} of ${this.totalItems} results`;
  }
}
