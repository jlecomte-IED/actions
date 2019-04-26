package cmd

import (
	"encoding/json"
	"fmt"
	"os"

	"strings"

	"github.com/actions/workflow-parser/model"
	"github.com/inextensodigital/actions/github-workflow/parser"
	"github.com/inextensodigital/actions/github-workflow/printer"
	"github.com/spf13/cobra"
)

// On filter
var On string

// Env passed at creation
var Env []string

// Secret passed at creation
var Secret []string

// EnvAdd list of options
var EnvAdd = NewListOpts()

// EnvRm list of options
var EnvRm = NewListOpts()

// SecretAdd list of options
var SecretAdd = NewListOpts()

// SecretRm list of options
var SecretRm = NewListOpts()

// ListOpts list of options
type ListOpts struct {
	values *[]string
}

// NewListOpts creates a new ListOpts with the specified validator.
func NewListOpts() ListOpts {
	var values []string
	return *NewListOptsRef(&values)
}

// NewListOptsRef creates a new ListOpts with the specified values and validator.
func NewListOptsRef(values *[]string) *ListOpts {
	return &ListOpts{
		values: values,
	}
}

func (opts *ListOpts) String() string {
	if len(*opts.values) == 0 {
		return ""
	}
	return fmt.Sprintf("%v", *opts.values)
}

// Set validates if needed the input value and adds it to the
// internal slice.
func (opts *ListOpts) Set(value string) error {
	(*opts.values) = append((*opts.values), value)
	return nil
}

// Type returns a string name for this Option type
func (opts *ListOpts) Type() string {
	return "list"
}

// GetAll returns the values of slice.
func (opts *ListOpts) GetAll() []string {
	return (*opts.values)
}

var actionCmd = &cobra.Command{
	Use:   "action",
	Short: "Actions",
	Run: func(cmd *cobra.Command, args []string) {
		cmd.Help()
		os.Exit(0)
	},
}

var actionLsCmd = &cobra.Command{
	Use:     "list [ID]",
	Short:   "List actions",
	Aliases: []string{"ls"},
	Args:    cobra.MaximumNArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		conf := parser.LoadData()

		iA := 0
		if len(args) == 1 {
			action := conf.GetAction(args[0])
			fmt.Fprintf(os.Stdout, "%s\n", action.Identifier)
			iA++
		} else {
			for _, action := range conf.Actions {
				fmt.Fprintf(os.Stdout, "%s\n", action.Identifier)
				iA++
			}
		}

		if iA == 0 {
			os.Exit(1)
		}
	},
}

var actionRenameCmd = &cobra.Command{
	Use:     "rename SOURCE TARGET",
	Short:   "Rename action",
	Aliases: []string{"mv"},
	Args:    cobra.ExactArgs(2),
	Run: func(cmd *cobra.Command, args []string) {
		source, target := args[0], args[1]
		conf := parser.LoadData()

		action := conf.GetAction(target)
		if action != nil {
			fmt.Fprintf(os.Stderr, "Action '%s' already exists, you should find another name to rename your action.\n", target)
			os.Exit(1)
		}

		action = conf.GetAction(source)
		if action == nil {
			fmt.Fprintf(os.Stderr, "Unknown action '%s'. Please check if you have made a typo.\n", source)
			os.Exit(1)
		}
		action.Identifier = target

		for _, action := range conf.Actions {
			for index, need := range action.Needs {
				if need == source {
					action.Needs[index] = target
				}
			}
		}

		for _, workflow := range conf.Workflows {
			for index, resolve := range workflow.Resolves {
				if resolve == source {
					workflow.Resolves[index] = target
				}
			}
		}

		content, _ := printer.Encode(conf)
		printer.Write(content, Output)
	},
}

var actionCreateCmd = &cobra.Command{
	Use:     "create ID USE",
	Short:   "Create new action",
	Args:    cobra.MinimumNArgs(2),
	Aliases: []string{"new", "c"},
	Run: func(cmd *cobra.Command, args []string) {
		id, use := args[0], args[1]

		conf := parser.LoadData()
		action := conf.GetAction(id)
		if action != nil {
			fmt.Fprintf(os.Stderr, "Action '%s' already exists, can't create the same one more than once.\n", id)
			os.Exit(1)
		}

		u := model.UsesInvalid{Raw: use}
		uh := &u

		envList := make(map[string]string, 0)
		for _, v := range Env {
			env := strings.SplitN(v, "=", 2)
			if len(env) != 2 {
				fmt.Fprintf(os.Stderr, "Invalid env value '%s'. You should comply to the format: 'key=value'\n", v)
				os.Exit(1)
			}

			key, value := env[0], env[1]
			envList[key] = value
		}

		ghaction := model.Action{Identifier: id, Uses: uh, Env: envList}

		ghaction.Secrets = Secret

		conf.Actions = append(conf.Actions, &ghaction)

		content, _ := printer.Encode(conf)
		printer.Write(content, Output)
	},
}

func removeAction(slice []*model.Action, s int) []*model.Action {
	return append(slice[:s], slice[s+1:]...)
}

func removeFromSlice(slice []string, s int) []string {
	return append(slice[:s], slice[s+1:]...)
}

var actionRemoveCmd = &cobra.Command{
	Use:     "remove ID",
	Short:   "Remove action",
	Aliases: []string{"rm"},
	Args:    cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		id := args[0]
		conf := parser.LoadData()

		var ia int
		for k, action := range conf.Actions {
			if action.Identifier == id {
				ia = k
			}
		}

		listAction := removeAction(conf.Actions, ia)
		conf.Actions = listAction

		// remove the action from workflow resolves
		listWorkflow := make([]*model.Workflow, 0)
		for _, workflow := range conf.Workflows {
			for kr, resolver := range workflow.Resolves {
				if resolver == id {
					workflow.Resolves = removeFromSlice(workflow.Resolves, kr)
				}
			}
			listWorkflow = append(listWorkflow, workflow)
		}

		conf.Workflows = listWorkflow

		listAction = make([]*model.Action, 0)
		for _, action := range conf.Actions {
			for kr, need := range action.Needs {
				if need == id {
					action.Needs = removeFromSlice(action.Needs, kr)
				}
			}
			listAction = append(listAction, action)
		}
		conf.Actions = listAction

		content, _ := printer.Encode(conf)
		printer.Write(content, Output)
	},
}

var actionInspectCmd = &cobra.Command{
	Use:   "inspect ID [ID...]",
	Short: "Display detailed information on one or more actions",
	Args:  cobra.MinimumNArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		var exitCode = 0
		conf := parser.LoadData()
		for _, id := range args {
			action := conf.GetAction(id)
			if action == nil {
				fmt.Fprintf(os.Stderr, "Error: no such action: %s\n", id)
				exitCode = 1
			} else {
				jsonOutput, err := json.MarshalIndent(action, "", "    ")
				if err != nil {
					fmt.Println(err)
					return
				}
				fmt.Fprintf(os.Stdout, "%s\n", string(jsonOutput))
			}
		}

		os.Exit(exitCode)
	},
}

var actionUpdateCmd = &cobra.Command{
	Use:   "update ID",
	Short: "Update an action",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		var id = args[0]
		var exitCode = 0

		var flags = cmd.Flags()
		conf := parser.LoadData()

		if flags.Changed("env-add") {
			value := flags.Lookup("env-add").Value.(*ListOpts)
			for _, v := range value.GetAll() {
				env := strings.SplitN(v, "=", 2)
				if len(env) != 2 {
					fmt.Fprintf(os.Stderr, "Invalid env value '%s'. You should comply to the format: 'key=value'\n", v)
					os.Exit(1)
				}

				key, value := env[0], env[1]
				err := addEnvVarToAction(conf, id, key, value)
				if err != nil {
					fmt.Fprint(os.Stderr, err)
					os.Exit(1)
				}
			}
		}

		if flags.Changed("env-rm") {
			value := flags.Lookup("env-rm").Value.(*ListOpts)
			for _, env := range value.GetAll() {
				action := conf.GetAction(id)
				if action.Env != nil {
					delete(action.Env, env)
				}
			}
		}

		if flags.Changed("secret-add") {
			value := flags.Lookup("secret-add").Value.(*ListOpts)
			for _, secret := range value.GetAll() {
				action := conf.GetAction(id)
				if contains(action.Secrets, secret) {
					fmt.Fprintf(os.Stderr, "Secret '%s' already defined\n", secret)
					os.Exit(1)
				}
				action.Secrets = append(action.Secrets, secret)
			}
		}

		if flags.Changed("secret-rm") {
			value := flags.Lookup("secret-rm").Value.(*ListOpts)
			for _, secret := range value.GetAll() {
				action := conf.GetAction(id)
				if !contains(action.Secrets, secret) {
					fmt.Fprintf(os.Stderr, "Secret '%s' not defined\n", secret)
					os.Exit(1)
				}
				action.Secrets = removeFromSlice(action.Secrets, index(action.Secrets, secret))
				fmt.Printf("## secret rm: %s\n", secret)
			}
		}

		content, _ := printer.Encode(conf)
		printer.Write(content, Output)

		os.Exit(exitCode)
	},
}

func index(slice []string, item string) int {
	for i, value := range slice {
		if value == item {
			return i
		}
	}
	return -1
}

func addEnvVarToAction(conf *model.Configuration, id string, name string, value string) error {
	action := conf.GetAction(id)
	if action.Env == nil {
		action.Env = make(map[string]string)
	}

	if _, ok := action.Env[name]; ok {
		return fmt.Errorf("Env key : '%s' already defined\n", name)
	}

	action.Env[name] = value

	return nil
}

func init() {
	actionCmd.AddCommand(actionLsCmd)
	actionCmd.AddCommand(actionCreateCmd)
	actionCreateCmd.Flags().StringArrayVarP(&Env, "env", "e", []string{}, "")
	actionCreateCmd.Flags().StringArrayVarP(&Secret, "secret", "s", []string{}, "")
	actionCmd.AddCommand(actionRenameCmd)
	actionCmd.AddCommand(actionRemoveCmd)
	actionCmd.AddCommand(actionInspectCmd)
	actionCmd.AddCommand(actionUpdateCmd)
	actionUpdateCmd.Flags().Var(&EnvAdd, "env-add", "Add an environment variable")
	actionUpdateCmd.Flags().Var(&EnvRm, "env-rm", "Remove an environment variable")
	actionUpdateCmd.Flags().Var(&SecretAdd, "secret-add", "Add or update a secret")
	actionUpdateCmd.Flags().Var(&SecretRm, "secret-rm", "Remove a secret")
	actionCmd.Aliases = []string{"a"}

	rootCmd.AddCommand(actionCmd)
}
