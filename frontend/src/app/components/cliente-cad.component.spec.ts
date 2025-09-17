import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';

import { ClienteCadComponent } from './cliente-cad.component';
import { ClienteService } from '../services/cliente.service';
import { Cliente } from '../interfaces/cliente.interface';

describe('ClienteCadComponent', () => {
  let component: ClienteCadComponent;
  let fixture: ComponentFixture<ClienteCadComponent>;
  let clienteService: jasmine.SpyObj<ClienteService>;
  let router: Router;
  let location: Location;

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

  beforeEach(async () => {
    const clienteServiceSpy = jasmine.createSpyObj('ClienteService', [
      'save',
      'update',
      'getById'
    ]);

    await TestBed.configureTestingModule({
      declarations: [ClienteCadComponent],
      imports: [ReactiveFormsModule, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: ClienteService, useValue: clienteServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClienteCadComponent);
    component = fixture.componentInstance;
    clienteService = TestBed.inject(ClienteService) as jasmine.SpyObj<ClienteService>;
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);

    // Default service responses
    clienteService.save.and.returnValue(of(mockCliente));
    clienteService.update.and.returnValue(of(mockCliente));
    clienteService.getById.and.returnValue(of(mockCliente));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize with empty form for new client', () => {
      component.ngOnInit();

      expect(component.form.value).toEqual({
        name: '',
        email: '',
        phone: '',
        address: '',
        birthDate: null
      });
      expect(component.isEditMode).toBe(false);
      expect(component.pageTitle).toBe('Add New Client');
    });

    it('should load client data in edit mode', async () => {
      // Mock ActivatedRoute with client ID
      const activatedRoute = TestBed.inject(ActivatedRoute);
      activatedRoute.snapshot.paramMap.get = jasmine.createSpy().and.returnValue('123');

      component.ngOnInit();
      await fixture.whenStable();

      expect(clienteService.getById).toHaveBeenCalledWith('123');
      expect(component.isEditMode).toBe(true);
      expect(component.pageTitle).toBe('Edit Client');
      expect(component.clientId).toBe('123');
    });

    it('should create reactive form with validators', () => {
      component.ngOnInit();

      const form = component.form;
      expect(form.get('name')?.hasError('required')).toBe(true);
      expect(form.get('email')?.hasError('required')).toBe(true);

      form.patchValue({
        email: 'invalid-email'
      });
      expect(form.get('email')?.hasError('email')).toBe(true);
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should validate required fields', () => {
      const form = component.form;

      expect(form.valid).toBe(false);
      expect(form.get('name')?.hasError('required')).toBe(true);
      expect(form.get('email')?.hasError('required')).toBe(true);
    });

    it('should validate email format', () => {
      const emailControl = component.form.get('email');

      emailControl?.setValue('invalid-email');
      expect(emailControl?.hasError('email')).toBe(true);

      emailControl?.setValue('valid@example.com');
      expect(emailControl?.hasError('email')).toBe(false);
    });

    it('should validate name length', () => {
      const nameControl = component.form.get('name');

      nameControl?.setValue('A');
      expect(nameControl?.hasError('minlength')).toBe(true);

      nameControl?.setValue('Valid Name');
      expect(nameControl?.hasError('minlength')).toBe(false);
    });

    it('should validate phone number format', () => {
      const phoneControl = component.form.get('phone');

      phoneControl?.setValue('123');
      expect(phoneControl?.hasError('pattern')).toBe(true);

      phoneControl?.setValue('1234567890');
      expect(phoneControl?.hasError('pattern')).toBe(false);

      phoneControl?.setValue('123-456-7890');
      expect(phoneControl?.hasError('pattern')).toBe(false);
    });

    it('should display validation error messages', async () => {
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="name"]'));
      const emailInput = fixture.debugElement.query(By.css('input[formControlName="email"]'));

      nameInput.nativeElement.value = '';
      nameInput.nativeElement.dispatchEvent(new Event('input'));
      nameInput.nativeElement.dispatchEvent(new Event('blur'));

      emailInput.nativeElement.value = 'invalid-email';
      emailInput.nativeElement.dispatchEvent(new Event('input'));
      emailInput.nativeElement.dispatchEvent(new Event('blur'));

      fixture.detectChanges();
      await fixture.whenStable();

      const errorMessages = fixture.debugElement.queryAll(By.css('.invalid-feedback'));
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should save new client', async () => {
      const formData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        address: '123 Main St',
        birthDate: new Date('1990-01-01')
      };

      component.form.patchValue(formData);
      spyOn(router, 'navigate');

      component.onSubmit();
      await fixture.whenStable();

      expect(clienteService.save).toHaveBeenCalledWith(jasmine.objectContaining(formData));
      expect(router.navigate).toHaveBeenCalledWith(['/clients']);
      expect(component.isSubmitting).toBe(false);
    });

    it('should update existing client', async () => {
      component.isEditMode = true;
      component.clientId = '123';

      const formData = {
        name: 'Updated Name',
        email: 'updated@example.com',
        phone: '0987654321',
        address: '456 Oak Ave',
        birthDate: new Date('1985-05-15')
      };

      component.form.patchValue(formData);
      spyOn(router, 'navigate');

      component.onSubmit();
      await fixture.whenStable();

      expect(clienteService.update).toHaveBeenCalledWith('123', jasmine.objectContaining(formData));
      expect(router.navigate).toHaveBeenCalledWith(['/clients']);
    });

    it('should not submit invalid form', () => {
      component.form.patchValue({
        name: '', // Invalid - required
        email: 'invalid-email' // Invalid - format
      });

      component.onSubmit();

      expect(clienteService.save).not.toHaveBeenCalled();
      expect(clienteService.update).not.toHaveBeenCalled();
      expect(component.form.get('name')?.hasError('required')).toBe(true);
      expect(component.form.get('email')?.hasError('email')).toBe(true);
    });

    it('should handle submission errors', async () => {
      clienteService.save.and.returnValue(
        throwError(() => new Error('Save failed'))
      );

      component.form.patchValue({
        name: 'John Doe',
        email: 'john@example.com'
      });

      component.onSubmit();
      await fixture.whenStable();

      expect(component.error).toBe('Save failed');
      expect(component.isSubmitting).toBe(false);
    });

    it('should show loading state during submission', () => {
      component.form.patchValue({
        name: 'John Doe',
        email: 'john@example.com'
      });

      component.onSubmit();

      expect(component.isSubmitting).toBe(true);
    });
  });

  describe('Data Loading in Edit Mode', () => {
    beforeEach(() => {
      const activatedRoute = TestBed.inject(ActivatedRoute);
      activatedRoute.snapshot.paramMap.get = jasmine.createSpy().and.returnValue('123');
    });

    it('should populate form with client data', async () => {
      component.ngOnInit();
      await fixture.whenStable();

      expect(component.form.value).toEqual(jasmine.objectContaining({
        name: mockCliente.name,
        email: mockCliente.email,
        phone: mockCliente.phone,
        address: mockCliente.address
      }));
    });

    it('should handle client loading errors', async () => {
      clienteService.getById.and.returnValue(
        throwError(() => new Error('Client not found'))
      );

      component.ngOnInit();
      await fixture.whenStable();

      expect(component.error).toBe('Client not found');
      expect(component.isLoading).toBe(false);
    });

    it('should show loading state while fetching client', () => {
      component.ngOnInit();

      expect(component.isLoading).toBe(true);
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should navigate back to client list on cancel', () => {
      spyOn(location, 'back');

      component.onCancel();

      expect(location.back).toHaveBeenCalled();
    });

    it('should have cancel button in template', () => {
      const cancelButton = fixture.debugElement.query(
        By.css('button[type="button"]')
      );

      expect(cancelButton).toBeTruthy();
      expect(cancelButton.nativeElement.textContent.trim()).toContain('Cancel');
    });

    it('should have submit button in template', () => {
      const submitButton = fixture.debugElement.query(
        By.css('button[type="submit"]')
      );

      expect(submitButton).toBeTruthy();
    });
  });

  describe('UI Elements', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should display correct page title for new client', () => {
      component.isEditMode = false;
      fixture.detectChanges();

      const titleElement = fixture.debugElement.query(By.css('h3'));
      expect(titleElement.nativeElement.textContent.trim()).toBe('Add New Client');
    });

    it('should display correct page title for edit mode', () => {
      component.isEditMode = true;
      fixture.detectChanges();

      const titleElement = fixture.debugElement.query(By.css('h3'));
      expect(titleElement.nativeElement.textContent.trim()).toBe('Edit Client');
    });

    it('should disable submit button when form is invalid', () => {
      const submitButton = fixture.debugElement.query(
        By.css('button[type="submit"]')
      );

      expect(submitButton.nativeElement.disabled).toBe(true);

      component.form.patchValue({
        name: 'Valid Name',
        email: 'valid@example.com'
      });
      fixture.detectChanges();

      expect(submitButton.nativeElement.disabled).toBe(false);
    });

    it('should show loading indicator when loading', () => {
      component.isLoading = true;
      fixture.detectChanges();

      const loadingIndicator = fixture.debugElement.query(By.css('.spinner-border'));
      expect(loadingIndicator).toBeTruthy();
    });

    it('should display error message when error occurs', () => {
      component.error = 'Test error message';
      fixture.detectChanges();

      const errorAlert = fixture.debugElement.query(By.css('.alert-danger'));
      expect(errorAlert).toBeTruthy();
      expect(errorAlert.nativeElement.textContent).toContain('Test error message');
    });

    it('should have all required form fields', () => {
      const nameInput = fixture.debugElement.query(By.css('input[formControlName="name"]'));
      const emailInput = fixture.debugElement.query(By.css('input[formControlName="email"]'));
      const phoneInput = fixture.debugElement.query(By.css('input[formControlName="phone"]'));
      const addressInput = fixture.debugElement.query(By.css('input[formControlName="address"]'));
      const birthDateInput = fixture.debugElement.query(By.css('input[formControlName="birthDate"]'));

      expect(nameInput).toBeTruthy();
      expect(emailInput).toBeTruthy();
      expect(phoneInput).toBeTruthy();
      expect(addressInput).toBeTruthy();
      expect(birthDateInput).toBeTruthy();
    });

    it('should show submitting state on submit button', () => {
      component.isSubmitting = true;
      fixture.detectChanges();

      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      expect(submitButton.nativeElement.disabled).toBe(true);
      expect(submitButton.nativeElement.textContent).toContain('Saving...');
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

  describe('Helper Methods', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should check if field is invalid and touched', () => {
      const nameControl = component.form.get('name')!;
      nameControl.markAsTouched();

      expect(component.isFieldInvalid('name')).toBe(true);

      nameControl.setValue('Valid Name');
      expect(component.isFieldInvalid('name')).toBe(false);
    });

    it('should get field error message', () => {
      const nameControl = component.form.get('name')!;
      nameControl.markAsTouched();

      expect(component.getFieldError('name')).toBe('Name is required');

      nameControl.setValue('A');
      expect(component.getFieldError('name')).toBe('Name must be at least 2 characters long');

      const emailControl = component.form.get('email')!;
      emailControl.setValue('invalid-email');
      emailControl.markAsTouched();

      expect(component.getFieldError('email')).toBe('Please enter a valid email address');
    });
  });
});