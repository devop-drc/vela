import { usePageTitle } from "@/contexts/PageTitleContext";
import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryManager } from "@/components/attributes/CategoryManager";
import { AttributeManager } from "@/components/attributes/AttributeManager";

const Attributes = () => {
  const { setTitle } = usePageTitle();

  useEffect(() => {
    setTitle("Product Types");
  }, [setTitle]);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="categories">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="attributes">Attributes</TabsTrigger>
        </TabsList>
        <TabsContent value="categories">
          <CategoryManager />
        </TabsContent>
        <TabsContent value="attributes">
          <AttributeManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Attributes;