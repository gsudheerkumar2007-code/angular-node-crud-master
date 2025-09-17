import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let fixture: any;
  let component: AppComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AppComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct title', () => {
    expect(component.title).toEqual('crudTeste');
  });

  it('should render router outlet', () => {
    fixture.detectChanges();
    const routerOutlet = fixture.debugElement.query(By.css('router-outlet'));
    expect(routerOutlet).toBeTruthy();
  });

  it('should initialize component properties correctly', () => {
    expect(component.title).toBeDefined();
    expect(typeof component.title).toBe('string');
  });

  it('should not have any console errors during initialization', () => {
    spyOn(console, 'error');

    fixture.detectChanges();

    expect(console.error).not.toHaveBeenCalled();
  });

  describe('Component Integration', () => {
    it('should handle component lifecycle without errors', () => {
      expect(() => {
        fixture.detectChanges();
        fixture.destroy();
      }).not.toThrow();
    });

    it('should have proper template structure', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;

      // Basic structure checks
      expect(compiled).toBeTruthy();
      expect(compiled.children.length).toBeGreaterThan(0);
    });

    it('should render expected content structure', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;

      // Check for router outlet which is the main content area
      const routerOutlet = compiled.querySelector('router-outlet');
      expect(routerOutlet).toBeTruthy();
    });
  });
});
