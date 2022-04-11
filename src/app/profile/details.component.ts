import { Component } from '@angular/core';
import {ActivatedRoute, Router } from '@angular/router';

import { AccountService } from '@app/_services';

@Component({ templateUrl: 'details.component.html' })
export class DetailsComponent {
    account = this.accountService.accountValue;
    isSocialAccount = (this.account.idp === 'SOCIAL')? true: false;


    constructor(
      private router: Router,
      private route: ActivatedRoute,
      private accountService: AccountService,
    ) { }

    updateProfile() {
      this.router.navigate(['update'], { relativeTo: this.route});
    }
}
