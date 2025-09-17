import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ClienteCadComponent } from './components/cliente-cad.component';
import { ClienteListComponent } from './components/cliente-list.component';

const routes: Routes = [
  { path: '', redirectTo: '/clients', pathMatch: 'full' },
  { path: 'clients', component: ClienteListComponent },
  { path: 'clients/add', component: ClienteCadComponent },
  { path: 'clients/edit/:id', component: ClienteCadComponent },
  // Legacy routes for backward compatibility
  { path: 'cliente/list', redirectTo: '/clients' },
  { path: 'cliente/cad', redirectTo: '/clients/add' },
  { path: 'cliente/cad/:id', redirectTo: '/clients/edit/:id' },
  { path: '**', redirectTo: '/clients' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
