package printer

import (
	"testing" 
	"fmt"
	"io/ioutil"
	"github.com/stretchr/testify/assert"
	"github.com/actions/workflow-parser/model"
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
			ID:     "action struct",
			Input:  &model.Configuration{
				Actions: []*model.Action {
					&model.Action{Identifier: "Docker Login", Uses: uh, Env: envList, Secrets: []string{"DOCKER_USERNAME", "DOCKER_PASSWORD"},},
				},
			},
			Output: "action",
		},
		{
			ID:     "workflow struct",
			Input:  &model.Configuration{
				Workflows: []*model.Workflow {
					&model.Workflow{Identifier: "on pull request merge, delete the branch", On: "pull_request", Resolves: []string{"branch cleanup"},},
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