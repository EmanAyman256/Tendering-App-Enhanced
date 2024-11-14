import { Injectable } from '@angular/core';
import { MainItem } from '../models/Mainitem.model';
import { MessageService } from 'primeng/api';
import { ApiServiceService } from './api-service.service';

@Injectable({
  providedIn: 'root'
})
export class RecordsFeaturesService {
  selectedRowsForProfit: MainItem[] = []; // Array to store selected rows
  profitMarginValue: number = 0;
  totalValue: number = 0.0

  constructor(private messageService:MessageService,private Apiservice:ApiServiceService) { }
  removePropertiesFrom(obj: any, propertiesToRemove: string[]): any {
    const newObj: any = {};
  
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (Array.isArray(obj[key])) {
          // If the property is an array, recursively remove properties from each element
          newObj[key] = obj[key].map((item: any) => this.removeProperties(item, propertiesToRemove));
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          // If the property is an object, recursively remove properties from the object
          newObj[key] = this.removeProperties(obj[key], propertiesToRemove);
        } else if (!propertiesToRemove.includes(key)) {
          // Otherwise, copy the property if it's not in the list to remove
          newObj[key] = obj[key];
        }
      }
    }
  
    return newObj;
  }
  removeProperties(obj: any, propertiesToRemove: string[]): any {
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
      if (!propertiesToRemove.includes(key)) {
        newObj[key] = obj[key];
      }
    });
    return newObj;
  }
  updateProfitMargin(value: number) {
    console.log(value);
  
    if (value !== null && value < 0) {
      this.profitMarginValue = 0; // Reset to 0 
     // alert('Negative values are not allowed');
     this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Negative values are not allowed', life: 4000 });
    } else {
  
      for (const row of this.selectedRowsForProfit) {
        row.profitMargin = value;
        const { invoiceMainItemCode, total, totalWithProfit, ...mainItemWithoutMainItemCode } = row;
        const updatedMainItem = this.removePropertiesFrom(mainItemWithoutMainItemCode, ['invoiceMainItemCode', 'invoiceSubItemCode']);
        console.log(updatedMainItem);
  
        const newRecord: MainItem = {
          ...updatedMainItem, // Copy all properties from the original record
          // Modify specific attributes
          subItems: (row?.subItems ?? []).map(subItem =>
            this.removeProperties(subItem, ['invoiceMainItemCode', 'invoiceSubItemCode'])
          ),
          profitMargin: value
  
        };
        console.log(newRecord);
        const updatedRecord = this.removeProperties(newRecord, ['selected'])
        this.Apiservice.patchMainItem<MainItem>(row.invoiceMainItemCode, updatedRecord).subscribe(response => {
          console.log('mainitem updated :', response);
          this.totalValue = 0;
          // this.ngOnInit();
        });
  
      }
    }
  }
  
}
