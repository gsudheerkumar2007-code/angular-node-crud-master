import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Cliente, ApiResponse, ApiError } from '../interfaces/cliente.interface';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private readonly apiUrl = '/api/client';

  constructor(private http: HttpClient) { }

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'An unexpected error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Network error: ${error.error.message}`;
      console.error('Client-side error:', error.error.message);
    } else {
      // Backend error
      const apiError = error.error as ApiError;

      if (apiError?.details && apiError.details.length > 0) {
        // Validation errors
        errorMessage = apiError.details.map(detail =>
          `${detail.field}: ${detail.message}`
        ).join(', ');
      } else if (apiError?.error) {
        errorMessage = apiError.error;
      } else if (apiError?.message) {
        errorMessage = apiError.message;
      } else {
        errorMessage = `Server error: ${error.status} ${error.statusText}`;
      }

      console.error(`Backend error: ${error.status}`, error.error);
    }

    return throwError(() => new Error(errorMessage));
  }

  save(cliente: Cliente): Observable<Cliente> {
    return this.http.post<Cliente>(this.apiUrl, cliente)
      .pipe(
        catchError(this.handleError)
      );
  }

  update(id: string, cliente: Partial<Cliente>): Observable<Cliente> {
    if (!id || !id.trim()) {
      return throwError(() => new Error('Client ID is required'));
    }

    return this.http.put<Cliente>(`${this.apiUrl}/${id}`, cliente)
      .pipe(
        catchError(this.handleError)
      );
  }

  getAll(page: number = 1, limit: number = 10): Observable<Cliente[]> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<ApiResponse<Cliente[]> | Cliente[]>(this.apiUrl, { params })
      .pipe(
        map(response => {
          // Handle both old and new API response formats
          if (Array.isArray(response)) {
            return response;
          } else {
            return (response as ApiResponse<Cliente[]>).data;
          }
        }),
        catchError(this.handleError)
      );
  }

  getById(id: string): Observable<Cliente> {
    if (!id || !id.trim()) {
      return throwError(() => new Error('Client ID is required'));
    }

    return this.http.get<Cliente>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  delete(id: string): Observable<{ message: string }> {
    if (!id || !id.trim()) {
      return throwError(() => new Error('Client ID is required'));
    }

    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  getAllWithPagination(page: number = 1, limit: number = 10): Observable<ApiResponse<Cliente[]>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<ApiResponse<Cliente[]>>(this.apiUrl, { params })
      .pipe(
        catchError(this.handleError)
      );
  }
}
