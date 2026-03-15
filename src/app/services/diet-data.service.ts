import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DietData } from '../models/diet.types';

@Injectable({ providedIn: 'root' })
export class DietDataService {
  private http = inject(HttpClient);

  loadDietData(): Observable<DietData> {
    return this.http.get<DietData>('./diet_data.json');
  }
}
