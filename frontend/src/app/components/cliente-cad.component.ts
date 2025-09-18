import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, Validators, FormBuilder, AbstractControl } from '@angular/forms';
import { ClienteService } from '../services/cliente.service';
import { Cliente } from '../interfaces/cliente.interface';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, EMPTY } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';

@Component({
  selector: 'cliente-cad',
  templateUrl: './cliente-cad.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClienteCadComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  id: string | null = null;
  submited = false;
  loading = false;
  message: string | null = null;
  isError = false;

  form: FormGroup = this.initForm();

  constructor(
    private fb: FormBuilder,
    private clienteService: ClienteService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (params) => {
          this.id = params['id'] || null;
          if (this.id) {
            this.loadClient();
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(client?: Cliente): FormGroup {
    return this.fb.group({
      code: [
        client?.code || '',
        [Validators.required, Validators.min(1)]
      ],
      name: [
        client?.name || '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(100)]
      ],
      email: [
        client?.email || '',
        [Validators.required, Validators.email]
      ],
      phone: [
        client?.phone || '',
        [Validators.pattern(/^[+]?[0-9\s\-\(\)]{10,15}$/)]
      ],
      address: [
        client?.address || '',
        [Validators.maxLength(200)]
      ],
      birthDate: [
        client?.birthDate ? this.formatDateForInput(client.birthDate) : '',
        [this.dateValidator]
      ],
      pincode: [
        client?.pincode || '',
        [Validators.required, Validators.pattern(/^\d{6}$/)]
      ]
    });
  }

  private formatDateForInput(date: Date | string): string {
    if (!date) return '';

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';

    return dateObj.toISOString().split('T')[0];
  }

  private dateValidator(control: AbstractControl): { [key: string]: any } | null {
    if (!control.value) return null;

    const date = new Date(control.value);
    const today = new Date();

    if (isNaN(date.getTime())) {
      return { invalidDate: true };
    }

    if (date > today) {
      return { futureDate: true };
    }

    return null;
  }

  private loadClient(): void {
    if (!this.id) return;

    this.loading = true;
    this.message = null;
    this.isError = false;

    this.clienteService.getById(this.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading client:', error);
          this.message = error.message || 'Failed to load client';
          this.isError = true;
          return EMPTY;
        }),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (data: Cliente) => {
          this.form = this.initForm(data);
        }
      });
  }

  onSubmit(): void {
    this.submited = true;
    this.message = null;
    this.isError = false;

    if (!this.form.valid) {
      this.markFormGroupTouched(this.form);
      return;
    }

    const cliente: Cliente = {
      ...this.form.value,
      birthDate: this.form.value.birthDate ? new Date(this.form.value.birthDate) : undefined
    };

    if (this.id) {
      this.updateClient(cliente);
    } else {
      this.createClient(cliente);
    }
  }

  private updateClient(cliente: Partial<Cliente>): void {
    this.loading = true;

    this.clienteService.update(this.id!, cliente)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error updating client:', error);
          this.message = error.message || 'Failed to update client';
          this.isError = true;
          return EMPTY;
        }),
        finalize(() => {
          this.loading = false;
          this.submited = false;
        })
      )
      .subscribe({
        next: () => {
          this.message = 'Client successfully updated!';
          this.isError = false;
          setTimeout(() => this.router.navigate(['/clients']), 2000);
        }
      });
  }

  private createClient(cliente: Cliente): void {
    this.loading = true;

    this.clienteService.save(cliente)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error creating client:', error);
          this.message = error.message || 'Failed to create client';
          this.isError = true;
          return EMPTY;
        }),
        finalize(() => {
          this.loading = false;
          this.submited = false;
        })
      )
      .subscribe({
        next: () => {
          this.form.reset();
          this.message = 'Client successfully created!';
          this.isError = false;
          setTimeout(() => this.router.navigate(['/clients']), 2000);
        }
      });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getFieldError(fieldName: string): string | null {
    const field = this.form.get(fieldName);
    if (!field || !field.touched || !field.errors) return null;

    const errors = field.errors;

    if (errors['required']) return `${fieldName} is required`;
    if (errors['email']) return 'Please enter a valid email address';
    if (errors['minlength']) return `${fieldName} must be at least ${errors['minlength'].requiredLength} characters`;
    if (errors['maxlength']) return `${fieldName} cannot exceed ${errors['maxlength'].requiredLength} characters`;
    if (errors['pattern']) {
      if (fieldName === 'pincode') return 'Pincode must be exactly 6 digits';
      return `Please enter a valid ${fieldName} format`;
    }
    if (errors['min']) return `${fieldName} must be at least ${errors['min'].min}`;
    if (errors['invalidDate']) return 'Please enter a valid date';
    if (errors['futureDate']) return 'Birth date cannot be in the future';

    return 'Invalid input';
  }

  onCancel(): void {
    this.router.navigate(['/clients']);
  }
}