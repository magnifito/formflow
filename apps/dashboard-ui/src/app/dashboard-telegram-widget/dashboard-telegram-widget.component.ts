import { Component, Input } from '@angular/core';
import { OnInit } from '@angular/core';
import { ViewChild, ElementRef } from '@angular/core';
import { fetchUrl } from '../global-vars';

@Component({
  selector: 'app-dashboard-telegram-widget',
  standalone: true,
  imports: [],
  templateUrl: './dashboard-telegram-widget.component.html',
  styleUrl: './dashboard-telegram-widget.component.scss'
})
export class DashboardTelegramWidgetComponent implements OnInit {
  @Input() userId: string | undefined;

  ngOnInit(): void {
    if (!this.userId) {
      return;
    }
    this.convertToScript();
  }

  @ViewChild('script', {static: true}) script!: ElementRef;
  convertToScript() {
    const element = this.script.nativeElement;
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', "FormFlowBot");
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-auth-url', fetchUrl + '/oauth/telegram/' + this.userId);
    script.setAttribute('data-request-access', 'write');
    element.parentElement.replaceChild(script, element);
  }
}
