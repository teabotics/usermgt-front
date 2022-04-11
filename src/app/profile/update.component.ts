import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';

import { AccountService, AlertService } from '@app/_services';
import { MustMatch } from '@app/_helpers';
import {Account} from "../_models";

@Component({ templateUrl: 'update.component.html' })
export class UpdateComponent implements OnInit {
    account = this.accountService.accountValue;
    form: FormGroup;
    loading = false;
    submitted = false;
    deleting = false;

    constructor(
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private accountService: AccountService,
        private alertService: AlertService
    ) { }

    ngOnInit() {
        this.form = this.formBuilder.group({
            // title: [this.account.title, Validators.required],
            // firstName: [this.account.firstName, Validators.required],
            // lastName: [this.account.lastName, Validators.required],
            username: [this.account.username, Validators.required],
            email: [this.account.email, ''],
            oldPassword: ['', [Validators.required, Validators.pattern('^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[*.!@$%^&(){}\\[\\]:;<>,.?/~_+\\-=|\\\\]).{8,}$')]],
            password: ['', [Validators.required, Validators.pattern('^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[*.!@$%^&(){}\\[\\]:;<>,.?/~_+\\-=|\\\\]).{8,}$')]],
            confirmPassword: ['', Validators.required]
        }, {
            validator: MustMatch('password', 'confirmPassword')
        });
    }

    // convenience getter for easy access to form fields
    get f() { return this.form.controls; }

    onSubmit() {
        this.submitted = true;

        // reset alerts on submit
        this.alertService.clear();



        // 如果password三個欄位都是空的，就把validator都拿掉，才不會擋住submit
        if (this.f.oldPassword.value == '' && this.f.password.value == '' && this.f.confirmPassword.value == ''){
          this.form.get('oldPassword').clearValidators();
          this.form.get('oldPassword').updateValueAndValidity();
          this.form.get('password').clearValidators();
          this.form.get('password').updateValueAndValidity();
          this.form.get('confirmPassword').clearValidators();
          this.form.get('confirmPassword').updateValueAndValidity();
        }

        // stop here if form is invalid
        if (this.form.invalid) {
            return;
        }
        this.loading = true;
        var accountToUpdate: Account = new Account();
        accountToUpdate.id = this.account.id;
        accountToUpdate.email = this.account.email;
        accountToUpdate.username = this.f.username.value;

        if (this.f.oldPassword.value != '' && this.f.password.value != '' && this.f.confirmPassword.value != ''){
          accountToUpdate.password = this.f.password.value;
          accountToUpdate.old_password = this.f.oldPassword.value;
        }

        // this.accountService.update(this.account.id, this.form.value)
        this.accountService.updateByAccountObject(accountToUpdate)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.alertService.success('Update successful', { keepAfterRouteChange: true });
                    this.router.navigate(['../'], { relativeTo: this.route });
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }

    onDelete() {
        if (confirm('Are you sure?')) {
            this.deleting = true;
            this.accountService.delete(this.account.id)
                .pipe(first())
                .subscribe(() => {
                    this.alertService.success('Account deleted successfully', { keepAfterRouteChange: true });
                });
        }
    }
}
