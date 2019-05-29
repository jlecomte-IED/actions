package printer

import (
	"fmt"
	"io/ioutil"
	"testing"

	"github.com/actions/workflow-parser/model"
	"github.com/stretchr/testify/assert"
)

type encoderTest struct {
	ID     string
	Input  *model.Configuration
	Output string
	Error  bool
}

func TestEncode(t *testing.T) {
	u := model.UsesInvalid{Raw: "inextensodigital/actions/deployment@master"}
	uh := &u
	envList := make(map[string]string)

	tests := []encoderTest{
		{
			ID:     "empty struct",
			Input:  &model.Configuration{},
			Output: "empty",
		},
		{
			ID: "action struct",
			Input: &model.Configuration{
				Actions: []*model.Action{
					&model.Action{Identifier: "deploy", Uses: uh, Needs: []string{"with secrets", "with env"}, Env: envList, Runs: &model.StringCommand{Value: `bash ./scripts/test.sh`} },
					&model.Action{Identifier: "with secrets", Needs: []string{"bare"}, Uses: uh, Env: envList, Secrets: []string{"SUPER_SECRET", "SUPER_PASSWORD"}},
					&model.Action{Identifier: "with env", Uses: uh, Env: map[string]string{"SUPER_ENV": "value"}},
					&model.Action{Identifier: "bare", Uses: uh, Env: envList},
				},
			},
			Output: "action",
		},
		{
			ID: "workflow struct",
			Input: &model.Configuration{
				Workflows: []*model.Workflow{
					&model.Workflow{Identifier: "on pull request merge, delete the branch", On: "pull_request", Resolves: []string{"branch cleanup"}},
				},
			},
			Output: "workflow",
		},
	}

	for _, test := range tests {
		actual, err := Encode(test.Input)

		if test.Error {
			assert.Error(t, err, test.ID)
		} else {
			expected, ferr := ioutil.ReadFile(fmt.Sprintf("../_tests/fixtures/%s.hcl", test.Output))
			if ferr != nil {
				t.Fatal(test.ID, "- could not read output HCL: ", ferr)
				continue
			}

			assert.NoError(t, err, test.ID)
			assert.EqualValues(t,
				string(expected),
				string(actual),
				fmt.Sprintf("%s\nExpected:\n%s\nActual:\n%s", test.ID, expected, actual),
			)
		}
	}
}
