import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalciatoriTableComponent } from './calciatori-table.component';

describe('CalciatoriTableComponent', () => {
  let component: CalciatoriTableComponent;
  let fixture: ComponentFixture<CalciatoriTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CalciatoriTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalciatoriTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
