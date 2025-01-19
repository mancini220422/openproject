import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { States } from 'core-app/core/states/states.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DebugElement, NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { NgSelectModule } from '@ng-select/ng-select';

import { By } from '@angular/platform-browser';
import { OpAutocompleterService } from './services/op-autocompleter.service';
import { IWorkPackageAutocompleteItem, WorkPackageRelationsAutocompleteComponent } from 'core-app/features/work-packages/components/wp-relations/wp-relations-create/wp-relations-autocomplete/wp-relations-autocomplete.component';
import { WorkPackageResource } from 'core-app/features/hal/resources/work-package-resource';
import { RelationResource } from 'core-app/features/hal/resources/relation-resource';

fdescribe('autocompleter', () => {
  let fixture:ComponentFixture<WorkPackageRelationsAutocompleteComponent>;
  //let opAutocompleterServiceSpy:jasmine.SpyObj<OpAutocompleterService>;
  const workPackagesStub = [
    {
      id: 1,
      subject: 'Workpackage 1',
      name: 'Workpackage 1',
      author: {
        href: '/api/v3/users/1',
        name: 'Author1',
      },
      description: {
        format: 'markdown',
        raw: 'Description of WP1',
        html: '<p>Description of WP1</p>',
      },
      createdAt: '2021-03-26T10:42:14Z',
      updatedAt: '2021-03-26T10:42:14Z',
      dueDate: '2021-03-26T10:42:14Z',
      startDate: '2021-03-26T10:42:14Z',
    },
    {
      id: 2,
      subject: 'Workpackage 2',
      name: 'Workpackage 2',
      author: {
        href: '/api/v3/users/2',
        name: 'Author2',
      },
      description: {
        format: 'markdown',
        raw: 'Description of WP2',
        html: '<p>Description of WP2</p>',
      },
      createdAt: '2021-03-26T10:42:14Z',
      updatedAt: '2021-03-26T10:42:14Z',
      dueDate: '2021-03-26T10:42:14Z',
      startDate: '2021-03-26T10:42:14Z',
    },
  ];

  beforeEach(() => {
    //opAutocompleterServiceSpy = jasmine.createSpyObj('OpAutocompleterService', ['loadData']);
    console.log("FOO")

    TestBed.configureTestingModule({
      declarations: [
        WorkPackageRelationsAutocompleteComponent],
      providers: [
        States
      ],
      imports: [HttpClientTestingModule, NgSelectModule],
      schemas: [NO_ERRORS_SCHEMA],
    })
     // .overrideComponent(
     //   WorkPackageRelationsAutocompleteComponent,
     //   { set: { providers: [{ provide: OpAutocompleterService, useValue: opAutocompleterServiceSpy }] } },
     // )
      .compileComponents();

    fixture = TestBed.createComponent(WorkPackageRelationsAutocompleteComponent);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    fixture.componentInstance.workPackage = { id: 'testId' } as WorkPackageResource; 
    fixture.componentInstance.resource = 'work_packages' as TOpAutocompleterResource;
    fixture.componentInstance.selectedRelationType = RelationResource.DEFAULT();
    fixture.componentInstance.model = {} as IWorkPackageAutocompleteItem
    fixture.componentInstance.filters = [];
    fixture.componentInstance.searchKey = 'subjectOrId';
    fixture.componentInstance.appendTo = 'body';
    fixture.componentInstance.multiple = false;
    fixture.componentInstance.closeOnSelect = true;
    fixture.componentInstance.virtualScroll = true;
    fixture.componentInstance.classes = 'wp-relations-autocomplete';
    fixture.componentInstance.defaultData = true;
    fixture.componentInstance.debounceTimeMs = 0;

    // @ts-ignore
    //opAutocompleterServiceSpy.loadData.and.returnValue(of(workPackagesStub));
  });

  it('should load the ng-select correctly', () => {
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      const autocompleter = document.querySelector('.ng-select-container');
      expect(document.contains(autocompleter)).toBeTruthy();
    });
  });

  it('should load WorkPackages', fakeAsync(() => {
    tick();
    fixture.detectChanges();
    fixture.componentInstance.ngAfterViewInit();
    tick(1000);
    fixture.detectChanges();
    const select = fixture.componentInstance.ngSelectInstance;
    expect(fixture.componentInstance.ngSelectInstance.isOpen).toBeFalse();
    fixture.componentInstance.ngSelectInstance.open();
    fixture.componentInstance.ngSelectInstance.focus();
    expect(fixture.componentInstance.ngSelectInstance.isOpen).toBeTrue();
    select.filter('a');

    fixture.detectChanges();
    tick(1000);
    fixture.detectChanges();
    tick(1000);

    //expect(opAutocompleterServiceSpy.loadData).toHaveBeenCalledWith('a',
    //  fixture.componentInstance.resource, fixture.componentInstance.filters, fixture.componentInstance.searchKey);

    expect(fixture.componentInstance.ngSelectInstance.itemsList.items.length).toEqual(2);
  }));
});
