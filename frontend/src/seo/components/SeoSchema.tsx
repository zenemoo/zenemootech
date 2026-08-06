import React, { useEffect } from 'react';

export interface SeoSchemaProps {
  id?: string;
  schema: Record<string, any> | Array<Record<string, any>>;
}

export const SeoSchema: React.FC<SeoSchemaProps> = ({ id = 'zenemoo-seo-jsonld', schema }) => {
  useEffect(() => {
    let script = document.getElementById(id);
    if (!script) {
      script = document.createElement('script');
      script.id = id;
      script.setAttribute('type', 'application/ld+json');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);
  }, [id, schema]);

  return null;
};
