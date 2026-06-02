import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { NgForm, FormsModule } from '@angular/forms';

import { DataService } from '../../core/services/data.service';
import { ModalService, IModalContent } from '../../core/modal/modal.service';
import { ICustomer, IState } from '../../shared/interfaces';
import { GrowlerService, GrowlerMessageType } from '../../core/growler/growler.service';
import { LoggerService } from '../../core/services/logger.service';

// State center coordinates for map display
const STATE_COORDINATES: { [key: string]: { lat: number; lng: number } } = {
  'MN': { lat: 45.6945, lng: -93.9196 }, // Minnesota center
  'AZ': { lat: 33.7298, lng: -111.4312 }, // Arizona center
  'TX': { lat: 31.9686, lng: -99.9018 }, // Texas center
  'CA': { lat: 36.1162, lng: -119.6816 }, // California center
  'NY': { lat: 42.1657, lng: -74.9481 }, // New York center
  'FL': { lat: 27.6648, lng: -81.5158 }, // Florida center
  'IL': { lat: 40.3495, lng: -88.9861 }, // Illinois center
  'OH': { lat: 40.3888, lng: -82.7649 }, // Ohio center
  'PA': { lat: 40.5908, lng: -77.2098 }, // Pennsylvania center
  'GA': { lat: 33.0406, lng: -83.6431 }, // Georgia center
  'MI': { lat: 43.3266, lng: -84.5361 }, // Michigan center
  'NC': { lat: 35.6301, lng: -79.8064 }, // North Carolina center
  'WA': { lat: 47.4009, lng: -121.4905 }, // Washington center
  'CO': { lat: 39.0598, lng: -105.3111 }, // Colorado center
  'MA': { lat: 42.2352, lng: -71.0275 }, // Massachusetts center
};

@Component({
    selector: 'cm-customer-edit',
    templateUrl: './customer-edit.component.html',
    styleUrls: ['./customer-edit.component.css'],
    imports: [FormsModule]
})
export class CustomerEditComponent implements OnInit {

  customer: ICustomer =
    {
      id: 0,
      firstName: '',
      lastName: '',
      gender: '',
      address: '',
      city: '',
      latitude: 45.6945,
      longitude: -93.9196,
      state: {
        abbreviation: '',
        name: ''
      }
    };
  states: IState[] = [];
  errorMessage: string = '';
  deleteMessageEnabled: boolean = false;
  operationText = 'Insert';
  @ViewChild('customerForm', { static: true }) customerForm: NgForm = {} as NgForm;

  constructor(private router: Router,
    private route: ActivatedRoute,
    private dataService: DataService,
    private growler: GrowlerService,
    private modalService: ModalService,
    private logger: LoggerService) { }

  ngOnInit() {
    this.route.parent?.params.subscribe((params: Params) => {
      const id = +params['id'];
      if (id !== 0) {
        this.operationText = 'Update';
        this.getCustomer(id);
      }
    });

    this.dataService.getStates().subscribe((states: IState[]) => this.states = states);
  }


  getCustomer(id: number) {
    this.dataService.getCustomer(id).subscribe((customer: any) => {
      this.customer = customer;
      // If customer.state is a string (like "AZ"), convert it to a state object
      if (typeof this.customer.state === 'string' && this.states.length > 0) {
        const stateAbbr = this.customer.state as string;
        const matchingState = this.states.find(s => s.abbreviation === stateAbbr);
        if (matchingState) {
          this.customer.state = matchingState;
        }
      }
      // Set coordinates based on state if not already set
      const stateAbbr = (this.customer.state as IState).abbreviation || this.customer.state;
      const coords = STATE_COORDINATES[stateAbbr as string] || { lat: 45.6945, lng: -93.9196 };
      if (!this.customer.latitude || this.customer.latitude === 0) {
        this.customer.latitude = coords.lat;
      }
      if (!this.customer.longitude || this.customer.longitude === 0) {
        this.customer.longitude = coords.lng;
      }
    });
  }

  onStateChange() {
    // Update map coordinates when state is changed
    const stateAbbr = (this.customer.state as IState).abbreviation;
    if (stateAbbr && STATE_COORDINATES[stateAbbr]) {
      this.customer.latitude = STATE_COORDINATES[stateAbbr].lat;
      this.customer.longitude = STATE_COORDINATES[stateAbbr].lng;
    }
  }

  submit() {
    if (this.customer.id === 0) {
      this.dataService.insertCustomer(this.customer)
        .subscribe({
          next: (insertedCustomer: ICustomer) => {
            if (insertedCustomer) {
              // Mark form as pristine so that CanDeactivateGuard won't prompt before navigation
              this.customerForm.form.markAsPristine();
              this.router.navigate(['/customers']);
            } else {
              const msg = 'Unable to insert customer';
              this.growler.growl(msg, GrowlerMessageType.Danger);
              this.errorMessage = msg;
            }
          },
          error: (err: any) => this.logger.log(err)
        });
    } else {
      this.dataService.updateCustomer(this.customer)
        .subscribe({
          next: (status: boolean) => {
            if (status) {
              // Mark form as pristine so that CanDeactivateGuard won't prompt before navigation
              this.customerForm.form.markAsPristine();
              this.growler.growl('Operation performed successfully.', GrowlerMessageType.Success);
              // this.router.navigate(['/customers']);
            } else {
              const msg = 'Unable to update customer';
              this.growler.growl(msg, GrowlerMessageType.Danger);
              this.errorMessage = msg;
            }
          },
          error: (err: any) => this.logger.log(err)
        });
    }
  }

  cancel(event: Event) {
    event.preventDefault();
    // Route guard will take care of showing modal dialog service if data is dirty
    this.router.navigate(['/customers']);
  }

  delete(event: Event) {
    event.preventDefault();
    this.dataService.deleteCustomer(this.customer.id)
      .subscribe({
        next: (status: boolean) => {
          if (status) {
            this.router.navigate(['/customers']);
          } else {
            this.errorMessage = 'Unable to delete customer';
          }
        },
        error: (err) => this.logger.log(err)
      });
  }


  canDeactivate(): Promise<boolean> | boolean {
    if (!this.customerForm.dirty) {
      return true;
    }

    // Dirty show display modal dialog to user to confirm leaving
    const modalContent: IModalContent = {
      header: 'Lose Unsaved Changes?',
      body: 'You have unsaved changes! Would you like to leave the page and lose them?',
      cancelButtonText: 'Cancel',
      OKButtonText: 'Leave'
    };
    return this.modalService.show(modalContent);
  }

}
