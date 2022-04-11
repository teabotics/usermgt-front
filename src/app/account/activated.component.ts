import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { first } from 'rxjs/operators';

import { AccountService, AlertService } from '@app/_services';
import { CookieService } from 'ngx-cookie-service';

@Component({ templateUrl: 'activated.component.html' })
export class ActivatedComponent implements OnInit {


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private accountService: AccountService,
    private alertService: AlertService,
    private coockieService:CookieService
  ) { }

  ngOnInit() {
    const username = this.route.snapshot.queryParams['username'];
    this.alertService.success('Dear '+ username +'. Your account is activated, you can now login', { keepAfterRouteChange: true });
    this.coockieService.deleteAll('/', 'usermgt-front.herokuapp.com', false, 'Lax');
    this.router.navigate(['../login'], { relativeTo: this.route });
  }
}
