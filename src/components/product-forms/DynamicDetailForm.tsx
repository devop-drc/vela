import { detailFormMap } from '@/lib/productFormConfig';
import { GenericDetailsForm } from './GenericDetailsForm';

export const DynamicDetailForm = ({ control, type }: { control: any, type: string }) => {
  const FormComponent = detailFormMap[type?.toLowerCase()] || GenericDetailsForm;
  return <FormComponent control={control} />;
};