import gql from "graphql-tag";
import { Alert } from "modules/common/utils";
import * as React from "react";
import { compose, graphql } from "react-apollo";
import { withRouter } from "react-router";
import { Form } from "../components";
import { mutations, queries } from "../graphql";

type Props = {
  contentTypeId: string;
  formId: string;
  fieldsQuery: any;
  brandsQuery: any;
  integrationDetailQuery: any;
  editIntegrationMutation: ({ variables }) => Promise<void>;
  editFormMutation: ({ variables }) => Promise<void>;
  addFieldMutation: ({ variables }) => Promise<void>;
  editFieldMutation: ({ variables }) => Promise<void>;
  removeFieldMutation: ({ variables }) => Promise<void>;
  location: any;
  history: any;
  queryParams: any;
};

class EditFormContainer extends React.Component<Props, {}> {
  render() {
    const {
      formId,
      brandsQuery,
      integrationDetailQuery,
      editIntegrationMutation,
      addFieldMutation,
      editFieldMutation,
      removeFieldMutation,
      editFormMutation,
      fieldsQuery,
      history
    } = this.props;

    if (
      fieldsQuery.loading ||
      brandsQuery.loading ||
      integrationDetailQuery.loading
    ) {
      return false;
    }

    const brands = brandsQuery.brands || [];
    const dbFields = fieldsQuery.fields || [];
    const integration = integrationDetailQuery.integrationDetail || {};

    const save = doc => {
      const { form, brandId, name, languageCode, formData, fields } = doc;

      // edit form
      editFormMutation({ variables: { _id: formId, ...form } })
        .then(() =>
          // edit integration
          editIntegrationMutation({
            variables: {
              _id: integration._id,
              formData,
              brandId,
              name,
              languageCode,
              formId
            }
          })
        )

        .then(() => {
          const dbFieldIds = dbFields.map(field => field._id);
          const existingIds = [];
          const createFieldsData = [];
          const updateFieldsData = [];
          const removeFieldsData = [];

          // collect fields ================
          for (const field of fields) {
            // collect fields to update
            if (dbFieldIds.includes(field._id)) {
              existingIds.push(field._id);
              updateFieldsData.push(field);
              continue;
            }

            // collect fields to create
            delete field._id;

            createFieldsData.push({
              ...field,
              contentType: "form",
              contentTypeId: formId
            });
          }

          // collect fields to remove
          for (const dbFieldId of dbFieldIds) {
            if (!existingIds.includes(dbFieldId)) {
              removeFieldsData.push({ _id: dbFieldId });
            }
          }

          // save fields ===================
          const promises = [];

          const doMutation = ({ datas, mutation }) => {
            for (const data of datas) {
              promises.push(mutation({ variables: data }));
            }
          };

          doMutation({ datas: createFieldsData, mutation: addFieldMutation });
          doMutation({ datas: updateFieldsData, mutation: editFieldMutation });
          doMutation({
            datas: removeFieldsData,
            mutation: removeFieldMutation
          });

          return Promise.all(promises);
        })

        .then(() => {
          Alert.success("Congrats");

          fieldsQuery.refetch().then(() => {
            history.push("/forms");
          });
        })

        .catch(error => {
          Alert.error(error.message);
        });
    };

    const updatedProps = {
      ...this.props,
      brands,
      integration,
      fields: dbFields.map(field => ({ ...field })),
      save
    };

    return <Form {...updatedProps} />;
  }
}

const EditFormIntegrationContainer = compose(
  graphql(gql(queries.brands), {
    name: "brandsQuery",
    options: () => ({
      fetchPolicy: "network-only"
    })
  }),
  graphql<Props>(gql(queries.fields), {
    name: "fieldsQuery",
    options: ({ formId }) => {
      return {
        variables: {
          contentType: "form",
          contentTypeId: formId
        },
        fetchPolicy: "network-only"
      };
    }
  }),
  graphql<Props>(gql(queries.integrationDetail), {
    name: "integrationDetailQuery",
    options: ({ contentTypeId }) => ({
      variables: {
        _id: contentTypeId
      },
      fetchPolicy: "network-only"
    })
  }),
  graphql(gql(mutations.integrationsEditFormIntegration), {
    name: "editIntegrationMutation",
    options: {
      refetchQueries: ["formIntegrations", "formIntegrationCounts"]
    }
  }),
  graphql(gql(mutations.fieldsAdd), {
    name: "addFieldMutation"
  }),
  graphql(gql(mutations.fieldsEdit), {
    name: "editFieldMutation"
  }),
  graphql(gql(mutations.fieldsRemove), {
    name: "removeFieldMutation"
  }),
  graphql(gql(mutations.editForm), {
    name: "editFormMutation"
  })
)(EditFormContainer);

export default withRouter(EditFormIntegrationContainer);