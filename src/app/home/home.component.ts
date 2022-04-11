import { Component } from '@angular/core';

import { AccountService } from '@app/_services';
import {Account} from "@app/_models";
import {first} from "rxjs/operators";
import {AcctStat} from "@app/_models/acctstat";

@Component({ templateUrl: 'home.component.html' })
export class HomeComponent {

  account = this.accountService.accountValue;
  accounts: Account[];
  acctStat: AcctStat;
  startDate: Date = new Date();
  endDate : Date = new Date();

  constructor(private accountService: AccountService) {}

  ngOnInit() {
    this.startDate.setDate(this.startDate.getDate()-6);
    this.accountService.getAll()
      .pipe(first())
      .subscribe(accounts => this.accounts = accounts);

    this.accountService.getAcctStat()
      .pipe(first())
      .subscribe(acctstat => this.acctStat = acctstat);

  }
}
