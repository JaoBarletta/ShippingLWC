import { LightningElement, api, track } from 'lwc';
import getEmailTemplates from '@salesforce/apex/EmailService.getEmailTemplates';
import sendEmailWithAttachments from '@salesforce/apex/ShippingEmailService.sendEmailWithAttachments';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class SendEmailWithFiles extends LightningElement {
  @api recordId;
  @track prefix = '';
  @track templateId = '';
  @track targetObjectId = '';
  @track overrideSubject = '';
  @track overrideBody = '';
  @track extraToAddresses = [];
  @track templateOptions = [];

  connectedCallback() {
    this.targetObjectId = this.recordId;
    getEmailTemplates()
      .then(data => {
        this.templateOptions = data.map(t => ({ label: t.Name, value: t.Id }));
      })
      .catch(error => {
        this.showToast('Erro ao carregar templates', error.body.message, 'error');
      });
  }

  handlePrefixChange(e)    { this.prefix = e.target.value; }
  handleTemplateChange(e)  { this.templateId = e.detail.value; }
  handleTargetChange(e)    { this.targetObjectId = e.target.value; }
  handleSubjectChange(e)   { this.overrideSubject = e.target.value; }
  handleBodyChange(e)      { this.overrideBody = e.target.value; }
  handleExtraToChange(e)   { this.extraToAddresses = e.target.value.split(';').map(s => s.trim()); }

  handleSendEmail() {
    sendEmailWithAttachments({
      templateId: this.templateId,
      whatId: this.recordId,
      targetObjectId: this.targetObjectId,
      contentVersionIds: [],      // Trigger ainda coleta os anexos
      overrideSubject: this.overrideSubject,
      overrideBody: this.overrideBody,
      extraToAddresses: this.extraToAddresses
    })
    .then(() => {
      this.showToast('Sucesso', 'Email enviado!', 'success');
    })
    .catch(error => {
      this.showToast('Erro ao enviar', error.body.message, 'error');
    });
  }

  showToast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }
}